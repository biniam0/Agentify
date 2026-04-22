/**
 * Workflow template catalog for the Workflow Creator modal.
 *
 * Each template describes:
 *   - Display metadata (title, icon key, description).
 *   - A list of typed slots the user fills in via the UI (combobox /
 *     multi-select / chip group / free text).
 *   - A preset list of questions (one is active at a time).
 *   - A `promptTemplate` string with `{slotId}` placeholders that are
 *     substituted with the user's inputs before the compiled prompt is
 *     sent to DeepSeek via `/workflows/run-simple`.
 *
 * Keep this file pure data — no React, no Tailwind — so the same config
 * can be reused from a backend-stored template system later without
 * refactoring.
 */

export type TemplateIconKey =
  | 'check-in'
  | 'follow-up'
  | 'stage'
  | 'stuck'
  | 'lost'
  | 'won'
  | 'company'
  | 'high-value';

export type SlotKind =
  | 'deal' // combobox populated by tenant deals (single)
  | 'deals' // combobox populated by tenant deals (multi)
  | 'contact' // combobox populated by tenant deal owners (single)
  | 'contacts' // combobox populated by tenant deal owners (multi)
  | 'company' // combobox populated by tenant companies (single)
  | 'companies' // combobox populated by tenant companies (multi)
  | 'stage' // chip-select from `DEAL_STAGES` (single)
  | 'stages' // chip-select from `DEAL_STAGES` (multi)
  | 'question' // chip-select from `questionPresets`
  | 'number' // plain numeric input (e.g. days, amount)
  | 'text'; // free-text input

export interface WorkflowTemplateSlot {
  id: string;
  label: string;
  kind: SlotKind;
  placeholder?: string;
  required?: boolean;
  help?: string;
  /** Optional min/max for `number` slots. */
  min?: number;
  max?: number;
}

export interface WorkflowTemplate {
  id: string;
  title: string;
  icon: TemplateIconKey;
  description: string;
  slots: WorkflowTemplateSlot[];
  /** At least one preset is required. First preset is the default selection. */
  questionPresets: string[];
  /**
   * Sentence with `{slotId}` placeholders. Multi-value slots are joined with
   * " and " (e.g. "Negotiation and Proposal Made"). `{question}` is the
   * currently-selected preset.
   */
  promptTemplate: string;
  /** Optional info banner shown in the expanded card. */
  note?: string;
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'client-check-in',
    title: 'Client check-in',
    icon: 'check-in',
    description: 'Check on a specific deal with its owner.',
    slots: [
      {
        id: 'deal',
        label: 'Deal',
        kind: 'deal',
        placeholder: 'Search for a deal...',
        required: true,
      },
    ],
    questionPresets: [
      'ask for a quick status update',
      'ask whether anything is blocking the deal',
      'ask for the next planned step',
      'ask when the next customer touchpoint is',
    ],
    promptTemplate: 'Call the owner of the "{deal}" deal and {question}.',
  },

  {
    id: 'contact-follow-up',
    title: 'Contact follow-up',
    icon: 'follow-up',
    description: 'Reach out to a specific rep about their deal(s).',
    slots: [
      {
        id: 'contact',
        label: 'Sales rep',
        kind: 'contact',
        placeholder: 'Search for a rep...',
        required: true,
      },
      {
        id: 'deals',
        label: 'Deal(s)',
        kind: 'deals',
        placeholder: 'Pick one or more deals...',
        required: true,
      },
    ],
    questionPresets: [
      'ask for an update on each deal',
      'ask about the current status and expected close date',
      'ask whether they need any help moving the deal forward',
    ],
    promptTemplate: 'Call {contact} about {deals} and {question}.',
  },

  {
    id: 'stage-check',
    title: 'Stage check',
    icon: 'stage',
    description: 'Call all owners of deals currently in a given stage.',
    slots: [
      {
        id: 'stages',
        label: 'Stage(s)',
        kind: 'stages',
        required: true,
        help: 'Pick one or more pipeline stages.',
      },
    ],
    questionPresets: [
      'ask for the current status of each deal',
      'ask what needs to happen to move the deal to the next stage',
      'ask about any blockers or concerns',
    ],
    promptTemplate: 'Call every owner with deals in {stages} and {question}.',
  },

  {
    id: 'stuck-deal',
    title: 'Stuck-deal escalation',
    icon: 'stuck',
    description: 'Follow up on deals that have sat in a stage too long.',
    slots: [
      {
        id: 'stage',
        label: 'Stage',
        kind: 'stage',
        required: true,
      },
      {
        id: 'days',
        label: 'Days in stage',
        kind: 'number',
        placeholder: 'e.g. 14',
        min: 1,
        max: 365,
        required: true,
      },
    ],
    questionPresets: [
      'ask why the deal has not moved forward',
      'ask what it would take to unstick the deal',
      'ask whether the deal should be re-qualified or closed out',
    ],
    promptTemplate:
      'Call owners of deals that have been in {stage} for more than {days} days and {question}.',
    note:
      "Date filtering is approximate — our AI interprets the day count contextually. For exact day counts, use 'Write your own'.",
  },

  {
    id: 'lost-post-mortem',
    title: 'Lost-deal post-mortem',
    icon: 'lost',
    description: 'Gather honest feedback on recently lost deals.',
    slots: [],
    questionPresets: [
      'ask what the primary reason for the loss was',
      'ask who the deal was lost to and why',
      'ask what we could have done differently',
    ],
    promptTemplate: 'Call every owner of Lost deals and {question}.',
  },

  {
    id: 'won-retrospective',
    title: 'Won-deal retrospective',
    icon: 'won',
    description: 'Celebrate wins and capture what worked.',
    slots: [],
    questionPresets: [
      'congratulate them and ask what played the biggest role in winning this deal',
      'ask which messaging or demo resonated most with the buyer',
      'ask if there are referral opportunities from this account',
    ],
    promptTemplate: 'Call every owner of Closed Won deals and {question}.',
  },

  {
    id: 'company-outreach',
    title: 'Company-wide outreach',
    icon: 'company',
    description: 'Call every owner working on deals at a specific company.',
    slots: [
      {
        id: 'company',
        label: 'Company',
        kind: 'company',
        placeholder: 'Search for a company...',
        required: true,
      },
    ],
    questionPresets: [
      'ask for a consolidated status across their deals at this company',
      'ask whether there is a coordinated account plan in place',
      'ask about the main buyer contact and their latest feedback',
    ],
    promptTemplate: 'Call every owner with deals at {company} and {question}.',
  },

  {
    id: 'high-value-deals',
    title: 'High-value deals',
    icon: 'high-value',
    description: 'Focus on deals above a dollar threshold.',
    slots: [
      {
        id: 'minAmount',
        label: 'Minimum amount (USD)',
        kind: 'number',
        placeholder: 'e.g. 50000',
        min: 0,
        required: true,
      },
    ],
    questionPresets: [
      'ask for a detailed status and close-date confidence',
      'ask what executive-level support is needed',
      'ask whether procurement or legal has been engaged yet',
    ],
    promptTemplate:
      'Call owners of deals worth at least ${minAmount} and {question}.',
    note: 'Amount filtering is handled by our AI from your prompt.',
  },
];

export function getTemplateById(id: string): WorkflowTemplate | undefined {
  return WORKFLOW_TEMPLATES.find((t) => t.id === id);
}

// ============================================
// Prompt compilation
// ============================================

export type SlotValue = string | string[] | number | undefined;
export type SlotValues = Record<string, SlotValue>;

function formatList(values: string[]): string {
  const clean = values.filter((v) => !!v && v.trim().length > 0);
  if (clean.length === 0) return '';
  if (clean.length === 1) return clean[0];
  if (clean.length === 2) return `${clean[0]} and ${clean[1]}`;
  return `${clean.slice(0, -1).join(', ')}, and ${clean[clean.length - 1]}`;
}

function formatValue(value: SlotValue, slot?: WorkflowTemplateSlot): string {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) return formatList(value.map(String));
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return '';
    // Add thousands separator for amount-ish slots
    if (slot?.id === 'minAmount' || slot?.id === 'maxAmount') {
      return value.toLocaleString('en-US');
    }
    return String(value);
  }
  return String(value).trim();
}

/**
 * Compile a template into a natural-language prompt.
 *
 * Placeholders:
 *   - `{slotId}` → user's input for that slot
 *   - `{question}` → the currently-selected question preset
 *
 * Unfilled placeholders are rendered as `[slotLabel]` so the live-preview
 * reads naturally while the user is still filling slots in.
 */
export function compileTemplatePrompt(
  template: WorkflowTemplate,
  values: SlotValues,
  question: string,
): string {
  const replacements: Record<string, string> = {};

  for (const slot of template.slots) {
    const v = values[slot.id];
    const formatted = formatValue(v, slot);
    replacements[slot.id] = formatted || `[${slot.label.toLowerCase()}]`;
  }

  replacements.question = question.trim() || '[question]';

  return template.promptTemplate.replace(/\{(\w+)\}/g, (_, key) =>
    key in replacements ? replacements[key] : `{${key}}`,
  );
}

/**
 * Returns true when every required slot has a non-empty value AND a
 * question preset is selected.
 */
export function isTemplateReady(
  template: WorkflowTemplate,
  values: SlotValues,
  question: string,
): boolean {
  if (!question || !question.trim()) return false;
  for (const slot of template.slots) {
    if (!slot.required) continue;
    const v = values[slot.id];
    if (v === undefined || v === null) return false;
    if (typeof v === 'string' && !v.trim()) return false;
    if (Array.isArray(v) && v.length === 0) return false;
    if (typeof v === 'number' && Number.isNaN(v)) return false;
  }
  return true;
}
