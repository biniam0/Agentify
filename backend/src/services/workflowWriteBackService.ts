/**
 * Workflow Write-Back Service
 *
 * Phase 2 of the WorkflowCallOutcome pipeline. Runs after the ElevenLabs
 * post-call webhook has persisted the raw call data (Phase 1) and handles
 * two things:
 *
 *   1. Classification — DeepSeek reads the raw transcript + workflow
 *      context and produces a structured outcome (`ACCEPTED / DECLINED /
 *      DEFERRED / PARTIAL`), confidence, reasoning, data points, and a
 *      concise summary. Results are written to `classification` and
 *      `extractedData` on the `WorkflowCallOutcome` row.
 *
 *   2. Write-back — if `WORKFLOW_WRITEBACK_ENABLED=true`, a summary note
 *      is pushed to BarrierX (HubSpot note engagement) via
 *      `barrierxService.createNoteEngagement`. `writeBackStatus` tracks
 *      `PENDING → IN_PROGRESS → SUCCESS | FAILED | SKIPPED` with
 *      `writeBackError` and `writeBackAt` populated on terminal states.
 *
 * The service is idempotent on `classification` (re-runs skip the LLM if
 * classification already exists) and on write-back (a row already in
 * SUCCESS / FAILED / SKIPPED isn't touched again). Inline retries with
 * exponential backoff cover transient BarrierX failures.
 *
 * Non-LLM outcomes (VOICEMAIL / NO_ANSWER / BUSY / FAILED) are pre-set in
 * Phase 1 (see `webhookController.updateWorkflowOutcomeFromWebhook`) and
 * are fast-pathed here — they skip both classification and write-back.
 */

import { z } from 'zod';

import prisma from '../config/database';
import { config } from '../config/env';
import * as barrierxService from './barrierxService';
import * as loggingService from './loggingService';
import { generateStructuredOutput } from './llm/deepseekService';

// ============================================
// TYPES
// ============================================

/**
 * Outcome values that the LLM is allowed to produce for COMPLETED calls
 * where voicemail / no-answer / busy / failed have already been ruled out
 * in Phase 1. The LLM never emits those four — if it tries, we reject.
 */
const LLM_OUTCOMES = ['ACCEPTED', 'DECLINED', 'DEFERRED', 'PARTIAL'] as const;
type LlmOutcome = (typeof LLM_OUTCOMES)[number];

const ClassificationSchema = z.object({
  outcome: z.enum(LLM_OUTCOMES).describe(
    "The overall result of the call from the manager's perspective. " +
      'ACCEPTED = rep engaged and committed to the ask. ' +
      'DECLINED = rep refused or pushed back. ' +
      'DEFERRED = rep asked to handle later (meeting / async). ' +
      'PARTIAL = rep agreed to some but not all of the ask.',
  ),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe('Confidence in the outcome classification between 0.0 and 1.0.'),
  reasoning: z
    .string()
    .describe('One- to three-sentence explanation of why this outcome was chosen.'),
  summary: z
    .string()
    .describe('Concise 1-3 sentence summary of the call written for the manager.'),
  keyTakeaways: z
    .array(z.string())
    .describe('Bullet points of the most important facts surfaced in the call.'),
  nextStep: z
    .string()
    .nullable()
    .describe(
      'The single concrete next step the rep committed to, verbatim if possible. Null if none.',
    ),
  blockers: z
    .array(z.string())
    .describe('Blockers, risks, or objections the rep surfaced. Empty array if none.'),
  mentionedStakeholders: z
    .array(z.string())
    .describe(
      'Names / roles of other people mentioned (champion, economic buyer, procurement, etc.).',
    ),
  commitments: z
    .array(
      z.object({
        commitment: z.string(),
        dueBy: z.string().nullable(),
      }),
    )
    .describe('Specific commitments the rep made, with due dates when mentioned.'),
});

export type WorkflowCallClassification = z.infer<typeof ClassificationSchema>;

// Shape we persist into `extractedData`. Mirrors the Zod shape minus the
// fields that live on `classification` alongside it.
interface ExtractedData {
  summary: string;
  keyTakeaways: string[];
  nextStep: string | null;
  blockers: string[];
  mentionedStakeholders: string[];
  commitments: Array<{ commitment: string; dueBy: string | null }>;
}

// ============================================
// RETRY POLICY
// ============================================

const WRITEBACK_RETRY_DELAYS_MS = [1000, 5000, 30_000]; // 3 attempts total
const CLASSIFICATION_MIN_TRANSCRIPT_TURNS = 2;

// ============================================
// HELPERS
// ============================================

type TranscriptTurn = { role?: string; message?: string };

function normalizeTranscript(raw: unknown): TranscriptTurn[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((t: any) => ({ role: t?.role, message: t?.message }))
    .filter((t) => t.role && t.message);
}

function transcriptToText(turns: TranscriptTurn[]): string {
  return turns
    .map((t) => `${(t.role || '').toUpperCase()}: ${t.message || ''}`)
    .join('\n');
}

function formatDurationHuman(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return '0s';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function composeNoteBody(args: {
  workflowName: string;
  originalPrompt: string | null;
  outcome: string;
  confidence: number | null;
  duration: number | null;
  classification: WorkflowCallClassification;
  conversationId: string | null;
  executionId: string;
}): string {
  const c = args.classification;
  const confidencePct =
    typeof args.confidence === 'number' ? `${Math.round(args.confidence * 100)}%` : 'n/a';

  const takeaways =
    c.keyTakeaways.length > 0
      ? c.keyTakeaways.map((t) => `• ${t}`).join('\n')
      : '(none surfaced)';

  const blockers =
    c.blockers.length > 0 ? c.blockers.map((b) => `• ${b}`).join('\n') : '(none)';

  const commitments =
    c.commitments.length > 0
      ? c.commitments
          .map((cm) => `• ${cm.commitment}${cm.dueBy ? ` — by ${cm.dueBy}` : ''}`)
          .join('\n')
      : '(none)';

  const stakeholders =
    c.mentionedStakeholders.length > 0 ? c.mentionedStakeholders.join(', ') : '(none)';

  return [
    '=== AgentX Workflow Call ===',
    `Workflow: ${args.workflowName}`,
    args.originalPrompt ? `Ask: ${args.originalPrompt}` : null,
    '',
    `Outcome: ${args.outcome} (confidence ${confidencePct})`,
    `Duration: ${formatDurationHuman(args.duration)}`,
    '',
    'Summary:',
    c.summary,
    '',
    'Key takeaways:',
    takeaways,
    '',
    `Next step committed: ${c.nextStep || 'none'}`,
    '',
    'Blockers / objections:',
    blockers,
    '',
    'Commitments:',
    commitments,
    '',
    `Stakeholders mentioned: ${stakeholders}`,
    '',
    args.conversationId ? `Conversation ID: ${args.conversationId}` : null,
    `Execution ID: ${args.executionId}`,
  ]
    .filter((l) => l !== null)
    .join('\n');
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ============================================
// CLASSIFICATION
// ============================================

async function classifyOutcome(args: {
  rawTranscript: TranscriptTurn[];
  transcriptSummary: string | null;
  workflowName: string;
  originalPrompt: string | null;
  targetName: string;
  dealName: string | null;
  dealStage: string | null;
  company: string | null;
}): Promise<WorkflowCallClassification | null> {
  if (args.rawTranscript.length < CLASSIFICATION_MIN_TRANSCRIPT_TURNS) {
    // Transcripts with 0-1 turns carry no meaningful signal — the
    // post-call webhook already surfaced the raw summary/status; we
    // shouldn't spend an LLM call guessing.
    return null;
  }

  const transcriptText = transcriptToText(args.rawTranscript).slice(0, 18_000);

  const systemPrompt = `You are analyzing the transcript of a call between a sales manager's AI agent and a sales rep.

Your job is to classify the call's outcome from the MANAGER'S perspective —
did the rep accept, decline, defer, or partially commit to the manager's ask?

Rules:
- Use EXACTLY one of: ACCEPTED, DECLINED, DEFERRED, PARTIAL. Never invent new values.
- ACCEPTED = rep engaged in good faith AND committed to the requested action.
- DECLINED = rep explicitly refused or strongly pushed back.
- DEFERRED = rep answered but asked to handle the ask later (e.g. "let's discuss in our 1:1", "email me this").
- PARTIAL = rep agreed to some but not all of the ask, or was non-committal about parts of it.
- Confidence must be a decimal between 0 and 1. Use <0.6 when the transcript is short or ambiguous.
- "nextStep" should be the single most concrete thing the rep promised to do, verbatim if possible; null if none.
- Keep "summary" to 1-3 sentences, written for a manager skimming a CRM note.
- Do NOT fabricate commitments, names, or dates that aren't in the transcript.
- If the rep only spoke in pleasantries and nothing substantive was resolved, output PARTIAL with low confidence.`;

  const userPrompt = `Context:
- Workflow: ${args.workflowName}
- Manager's ask (original prompt): ${args.originalPrompt || '(not recorded)'}
- Rep being called: ${args.targetName}
- Deal: ${args.dealName || '(unknown)'}${args.dealStage ? ` (stage: ${args.dealStage})` : ''}
- Company: ${args.company || '(unknown)'}

ElevenLabs-provided summary (may be empty):
${args.transcriptSummary || '(none)'}

Full transcript:
${transcriptText}`;

  try {
    console.log(
      `🤖 [writeBack] Classifying transcript (${args.rawTranscript.length} turns, deal="${args.dealName}")...`,
    );
    const classification = await generateStructuredOutput<WorkflowCallClassification>({
      prompt: userPrompt,
      systemPrompt,
      schema: ClassificationSchema,
      modelType: 'chat',
      temperature: 0.2,
    });
    console.log(
      `✅ [writeBack] Classified as ${classification.outcome} (confidence=${classification.confidence.toFixed(2)})`,
    );
    return classification;
  } catch (err: any) {
    console.error('❌ [writeBack] Classification failed:', err?.message || err);
    return null;
  }
}

// ============================================
// WRITE-BACK (BarrierX note)
// ============================================

async function pushBarrierXNote(args: {
  tenantSlug: string;
  dealId: string;
  ownerId: string;
  body: string;
}): Promise<{ success: boolean; engagementId?: string; error?: string }> {
  let lastErr: string | undefined;
  for (let attempt = 0; attempt < WRITEBACK_RETRY_DELAYS_MS.length; attempt++) {
    try {
      const res = await barrierxService.createNoteEngagement({
        tenantSlug: args.tenantSlug,
        dealId: args.dealId,
        ownerId: args.ownerId,
        body: args.body,
      });
      if (res.success) return res;
      lastErr = res.error || 'unknown BarrierX error';
    } catch (err: any) {
      lastErr = err?.message || String(err);
    }

    const isLastAttempt = attempt === WRITEBACK_RETRY_DELAYS_MS.length - 1;
    if (!isLastAttempt) {
      const delay = WRITEBACK_RETRY_DELAYS_MS[attempt];
      console.warn(
        `⚠️ [writeBack] BarrierX attempt ${attempt + 1} failed (${lastErr}); retrying in ${delay}ms`,
      );
      await sleep(delay);
    }
  }
  return { success: false, error: lastErr };
}

// ============================================
// PUBLIC: PROCESS ONE OUTCOME
// ============================================

export interface ProcessOutcomeResult {
  classified: boolean;
  wroteBack: boolean;
  skipped: boolean;
  reason?: string;
}

/**
 * Classify (if needed) and write back a single `WorkflowCallOutcome`.
 *
 * Lookup order: `conversationId` first (unique), then `outcomeId` as
 * fallback for cases where the webhook race hasn't set the conversation
 * id yet.
 *
 * This function is safe to call multiple times — classification and
 * write-back are both idempotent on their respective persisted fields.
 */
export async function processOutcome(args: {
  conversationId?: string;
  outcomeId?: string;
}): Promise<ProcessOutcomeResult> {
  // Lookup
  let record = null as Awaited<ReturnType<typeof prisma.workflowCallOutcome.findFirst>>;
  if (args.conversationId) {
    record = await prisma.workflowCallOutcome.findUnique({
      where: { conversationId: args.conversationId },
    });
  }
  if (!record && args.outcomeId) {
    record = await prisma.workflowCallOutcome.findUnique({
      where: { id: args.outcomeId },
    });
  }
  if (!record) {
    return { classified: false, wroteBack: false, skipped: true, reason: 'record not found' };
  }

  // Fast-path: Phase 1 already marked this as a non-LLM terminal outcome
  // (VOICEMAIL / NO_ANSWER / BUSY / FAILED) with writeBackStatus=SKIPPED.
  // Nothing to do.
  if (record.writeBackStatus === 'SKIPPED' || record.writeBackStatus === 'SUCCESS' || record.writeBackStatus === 'FAILED') {
    return {
      classified: !!record.classification,
      wroteBack: record.writeBackStatus === 'SUCCESS',
      skipped: true,
      reason: `writeBackStatus already ${record.writeBackStatus}`,
    };
  }

  // Only COMPLETED calls are candidates for LLM classification + write-back.
  if (record.status !== 'COMPLETED') {
    await prisma.workflowCallOutcome.update({
      where: { id: record.id },
      data: { writeBackStatus: 'SKIPPED', writeBackAt: new Date() },
    });
    return {
      classified: false,
      wroteBack: false,
      skipped: true,
      reason: `status=${record.status}`,
    };
  }

  // Hydrate the workflow intent/name for context in the note.
  const execution = await prisma.workflowExecution.findUnique({
    where: { id: record.executionId },
    include: { workflow: { select: { name: true, nlPrompt: true } } },
  });
  const workflowName = execution?.workflow?.name || 'NL Workflow';
  const originalPrompt = execution?.workflow?.nlPrompt || null;

  // ── Classification ────────────────────────────────────────────
  const transcriptTurns = normalizeTranscript(record.rawTranscript);
  let classification =
    (record.classification as WorkflowCallClassification | null) || null;
  let extractedData = (record.extractedData as ExtractedData | null) || null;
  let classifyRan = false;

  if (!classification) {
    const result = await classifyOutcome({
      rawTranscript: transcriptTurns,
      transcriptSummary: record.transcriptSummary,
      workflowName,
      originalPrompt,
      targetName: record.targetName,
      dealName: record.dealName,
      dealStage: null,
      company: null,
    });
    if (result) {
      classification = result;
      extractedData = {
        summary: result.summary,
        keyTakeaways: result.keyTakeaways,
        nextStep: result.nextStep,
        blockers: result.blockers,
        mentionedStakeholders: result.mentionedStakeholders,
        commitments: result.commitments,
      };
      classifyRan = true;

      await prisma.workflowCallOutcome.update({
        where: { id: record.id },
        data: {
          outcome: result.outcome as LlmOutcome,
          classification: JSON.parse(JSON.stringify(result)) as any,
          extractedData: JSON.parse(JSON.stringify(extractedData)) as any,
        },
      });
    } else {
      // Classification failed — mark write-back as SKIPPED so we don't block
      // on a half-populated row. A future re-run can retry classification.
      await prisma.workflowCallOutcome.update({
        where: { id: record.id },
        data: {
          writeBackStatus: 'SKIPPED',
          writeBackAt: new Date(),
          writeBackError: 'Classification unavailable (short transcript or LLM failure)',
        },
      });
      return {
        classified: false,
        wroteBack: false,
        skipped: true,
        reason: 'classification unavailable',
      };
    }
  }

  // ── Write-back gate ────────────────────────────────────────────
  if (!config.workflow.writeBackEnabled) {
    await prisma.workflowCallOutcome.update({
      where: { id: record.id },
      data: {
        writeBackStatus: 'SKIPPED',
        writeBackAt: new Date(),
        writeBackError: 'WORKFLOW_WRITEBACK_ENABLED=false',
      },
    });
    return {
      classified: classifyRan,
      wroteBack: false,
      skipped: true,
      reason: 'write-back disabled via env',
    };
  }

  if (!record.tenantSlug || !record.dealId || !record.hubspotOwnerId) {
    await prisma.workflowCallOutcome.update({
      where: { id: record.id },
      data: {
        writeBackStatus: 'SKIPPED',
        writeBackAt: new Date(),
        writeBackError: `missing identifiers (tenantSlug=${!!record.tenantSlug}, dealId=${!!record.dealId}, hubspotOwnerId=${!!record.hubspotOwnerId})`,
      },
    });
    return {
      classified: classifyRan,
      wroteBack: false,
      skipped: true,
      reason: 'missing identifiers for BarrierX note',
    };
  }

  // ── BarrierX push with inline retries ─────────────────────────
  await prisma.workflowCallOutcome.update({
    where: { id: record.id },
    data: { writeBackStatus: 'IN_PROGRESS' },
  });

  const body = composeNoteBody({
    workflowName,
    originalPrompt,
    outcome: classification.outcome,
    confidence: classification.confidence,
    duration: record.duration,
    classification,
    conversationId: record.conversationId,
    executionId: record.executionId,
  });

  const pushResult = await pushBarrierXNote({
    tenantSlug: record.tenantSlug,
    dealId: record.dealId,
    ownerId: record.hubspotOwnerId,
    body,
  });

  if (pushResult.success) {
    await prisma.workflowCallOutcome.update({
      where: { id: record.id },
      data: {
        writeBackStatus: 'SUCCESS',
        writeBackAt: new Date(),
        writeBackError: null,
      },
    });

    // Mirror into the existing CRM action log so the admin Logs UI
    // shows the engagement under its usual filters.
    await loggingService
      .logCrmAction({
        actionType: 'NOTE',
        conversationId: record.conversationId || undefined,
        dealId: record.dealId,
        tenantSlug: record.tenantSlug,
        ownerId: record.hubspotOwnerId,
        title: `AgentX Workflow Call · ${classification.outcome}`,
        body: classification.summary,
        status: 'SUCCESS',
        entityId: pushResult.engagementId,
        metadata: {
          source: 'workflow-writeback',
          executionId: record.executionId,
          outcomeId: record.id,
          outcome: classification.outcome,
          confidence: classification.confidence,
        },
      })
      .catch((e) => console.error('⚠️ [writeBack] CRM action log failed:', e?.message));

    console.log(
      `✅ [writeBack] BarrierX note created for outcome ${record.id} (engagement=${pushResult.engagementId})`,
    );
    return { classified: classifyRan, wroteBack: true, skipped: false };
  }

  // Failure path
  await prisma.workflowCallOutcome.update({
    where: { id: record.id },
    data: {
      writeBackStatus: 'FAILED',
      writeBackAt: new Date(),
      writeBackError: pushResult.error || 'unknown error',
    },
  });

  await loggingService
    .logError({
      errorType: 'EXTERNAL_SERVICE',
      severity: 'HIGH',
      source: 'workflowWriteBackService.pushBarrierXNote',
      message: pushResult.error || 'BarrierX note write-back failed',
      requestData: {
        executionId: record.executionId,
        outcomeId: record.id,
        tenantSlug: record.tenantSlug,
        dealId: record.dealId,
      },
    })
    .catch(() => { /* best-effort */ });

  return {
    classified: classifyRan,
    wroteBack: false,
    skipped: false,
    reason: pushResult.error,
  };
}
