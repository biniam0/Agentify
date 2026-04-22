import { useEffect, useState, useCallback, useRef } from 'react';
import {
  X,
  Sparkles,
  Target,
  BarChart2,
  Loader2,
  CheckCircle2,
  Circle,
  AlertCircle,
  AlertTriangle,
  Users,
  DollarSign,
  Clock,
  Phone,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Square,
  XCircle,
  PhoneCall,
  Ban,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import api from '@/services/api';
import { toast } from 'sonner';

interface SimpleIntent {
  action: string;
  target_criteria: Record<string, string | number | string[] | undefined>;
  script: {
    opening: string;
    main_ask: string;
    context?: string;
  };
  goal: string;
}

interface WorkflowTarget {
  name: string;
  phone: string;
  email?: string;
  dealId: string;
  dealName: string;
  dealStage?: string;
  dealAmount?: number;
  company?: string;
}

interface ApprovalData {
  intent: SimpleIntent;
  targets: { count: number; sample: WorkflowTarget[]; summary: string };
  estimatedCost: { estimatedCalls: number; estimatedCostUSD: number; estimatedDuration: number };
  requiresApproval: boolean;
}

export type LiveTargetStatus =
  | 'PENDING'
  | 'CALLING'
  | 'INITIATED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface LiveTargetInfo {
  name: string;
  phone: string;
  dealName?: string;
  company?: string;
  status: LiveTargetStatus;
  conversationId?: string;
  error?: string;
}

export interface WorkflowLiveState {
  isRunning: boolean;
  currentBatch: number;
  totalBatches: number;
  processedTargets: number;
  successfulCalls: number;
  failedCalls: number;
  skippedTargets: number;
  cancelledTargets: number;
  currentTargets: LiveTargetInfo[];
  recentLogs: string[];
  lastError: string | null;
}

export interface WorkflowExecStatus {
  id: string;
  workflowId: string;
  workflowName: string;
  prompt: string;
  status: string;
  totalTargets: number;
  callsInitiated: number;
  callsCompleted: number;
  callsFailed: number;
  callsCancelled?: number;
  startedAt: string | null;
  createdAt: string;
  live?: WorkflowLiveState | null;
}

type Step = 'prompt' | 'processing' | 'no-targets' | 'approval' | 'executing' | 'success' | 'live-progress';

interface SubStep {
  status: 'pending' | 'running' | 'complete' | 'error' | 'warning';
  message: string;
}

const WF_STORAGE_KEY = 'agentx_workflow_exec';

export interface PersistedWorkflowExec {
  executionId: string;
  totalTargets: number;
  workflowName: string;
  startedAt: string;
}

function persistWorkflowExec(data: PersistedWorkflowExec) {
  try { localStorage.setItem(WF_STORAGE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
}

export function clearWorkflowExec() {
  try { localStorage.removeItem(WF_STORAGE_KEY); } catch { /* ignore */ }
}

export function getPersistedWorkflowExec(): PersistedWorkflowExec | null {
  try {
    const raw = localStorage.getItem(WF_STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (p?.executionId) return p;
  } catch { /* corrupted */ }
  return null;
}

interface AddWorkflowModalProps {
  onClose: () => void;
  activeExecution?: WorkflowExecStatus | null;
  onExecutionChange?: () => void;
}

const AddWorkflowModal = ({ onClose, activeExecution, onExecutionChange }: AddWorkflowModalProps) => {
  const hasActiveExec = !!activeExecution;
  const [prompt, setPrompt] = useState('');
  const [step, setStep] = useState<Step>(hasActiveExec ? 'live-progress' : 'prompt');

  const [intent, setIntent] = useState<SimpleIntent | null>(null);
  const [targets, setTargets] = useState<{
    count: number;
    sample: WorkflowTarget[];
    summary: string;
    suggestions?: string[];
  } | null>(null);
  const [approvalData, setApprovalData] = useState<ApprovalData | null>(null);
  const [execution, setExecution] = useState<{ id: string } | null>(
    hasActiveExec ? { id: activeExecution!.id } : null
  );

  const [liveStatus, setLiveStatus] = useState<WorkflowExecStatus | null>(activeExecution || null);
  const [isCancelling, setIsCancelling] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const [substeps, setSubsteps] = useState<Record<string, SubStep>>({
    parsing: { status: 'pending', message: 'Analyzing your request...' },
    finding: { status: 'pending', message: 'Searching for targets...' },
    executing: { status: 'pending', message: 'Starting workflow...' },
  });

  const [error, setError] = useState<{ title: string; suggestion: string } | null>(null);
  const [scriptExpanded, setScriptExpanded] = useState(false);

  const fetchLiveStatus = useCallback(async () => {
    try {
      const res = await api.get('/workflows/execution-status');
      if (res.data.active) {
        setLiveStatus(res.data.execution);
      } else {
        setLiveStatus(null);
        clearWorkflowExec();
        setStep('success');
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (step !== 'live-progress') return;
    fetchLiveStatus();
    const interval = setInterval(fetchLiveStatus, 5000);
    return () => clearInterval(interval);
  }, [step, fetchLiveStatus]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && step !== 'processing' && step !== 'executing') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [onClose, step]);

  const runWorkflow = async () => {
    if (!prompt.trim()) return;

    setStep('processing');
    setError(null);
    setSubsteps({
      parsing: { status: 'running', message: 'Analyzing prompt with AI...' },
      finding: { status: 'pending', message: 'Searching for targets...' },
      executing: { status: 'pending', message: 'Awaiting approval...' },
    });

    try {
      const response = await api.post('/workflows/run-simple', {
        prompt,
        workflowName: `Workflow - ${new Date().toLocaleString()}`,
      });

      setIntent(response.data.intent);
      setTargets(response.data.targets);

      if (response.data.noTargetsFound) {
        setSubsteps({
          parsing: { status: 'complete', message: 'Intent parsed successfully!' },
          finding: { status: 'warning', message: 'No targets match your criteria' },
          executing: { status: 'pending', message: 'Cannot execute without targets' },
        });
        setTargets({
          count: 0,
          sample: [],
          summary: response.data.targets?.summary || 'No matching contacts found.',
          suggestions: response.data.suggestions,
        });
        setStep('no-targets');
        return;
      }

      if (response.data.requiresApproval) {
        setApprovalData({
          intent: response.data.intent,
          targets: response.data.targets,
          estimatedCost: response.data.estimatedCost,
          requiresApproval: true,
        });
        setSubsteps({
          parsing: { status: 'complete', message: 'Intent parsed successfully!' },
          finding: { status: 'complete', message: `Found ${response.data.targets.count} target${response.data.targets.count === 1 ? '' : 's'}!` },
          executing: { status: 'pending', message: 'Awaiting your approval...' },
        });
        setStep('approval');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message;
      setStep('prompt');
      if (msg.includes('security') || msg.includes('injection')) {
        setError({ title: 'Your prompt contains potentially unsafe content.', suggestion: 'Try rephrasing your request in simpler terms.' });
      } else if (msg.includes('timeout')) {
        setError({ title: 'The AI is taking too long to process.', suggestion: 'Try a shorter, more specific prompt.' });
      } else {
        setError({ title: 'Failed to process your request.', suggestion: msg || 'Please try again or use a different prompt.' });
      }
    }
  };

  const executeApproved = async () => {
    if (!approvalData) return;

    setStep('executing');
    setSubsteps((prev) => ({
      ...prev,
      executing: { status: 'running', message: 'Submitting calls to ElevenLabs...' },
    }));

    try {
      const workflowName = `Approved Workflow - ${new Date().toLocaleString()}`;
      const response = await api.post('/workflows/approve-and-execute', {
        intent: approvalData.intent,
        workflowName,
        userConfirmation: true,
        estimatedCost: approvalData.estimatedCost,
      });

      const execData = { id: response.data.execution.id as string };
      setExecution(execData);

      persistWorkflowExec({
        executionId: execData.id,
        totalTargets: approvalData.targets.count,
        workflowName,
        startedAt: new Date().toISOString(),
      });

      onExecutionChange?.();

      setSubsteps((prev) => ({
        ...prev,
        executing: { status: 'complete', message: 'Engine started — calls will run in scheduled batches' },
      }));
      // Switch straight into live-progress so the user sees real-time batches
      setStep('live-progress');
    } catch (err: any) {
      const isWarning = err.response?.status === 409 || err.response?.data?.warning;
      const msg = err.response?.data?.error || err.message;
      setStep('approval');
      setError({
        title: isWarning ? 'Outside calling hours' : 'Failed to start the workflow.',
        suggestion: msg || 'Please try again.',
      });
      setSubsteps((prev) => ({
        ...prev,
        executing: { status: isWarning ? 'warning' : 'error', message: isWarning ? 'Calling hours closed' : 'Execution failed' },
      }));
    }
  };

  const handleCancel = async () => {
    if (isCancelling) return;
    setIsCancelling(true);

    const targetId = liveStatus?.id || execution?.id;
    try {
      if (targetId) {
        await api.post(`/workflows/execution/${targetId}/cancel`);
      } else {
        await api.post('/workflows/execution/cancel-all');
      }
      toast.success('Cancel requested — engine will stop between batches');
    } catch (err: any) {
      toast.error('Failed to cancel', { description: err.response?.data?.error || err.message });
    } finally {
      setIsCancelling(false);
      // Don't clear state yet — let the live poller reflect status transitions,
      // then it'll flip to SUCCESS when status leaves RUNNING/PENDING.
      onExecutionChange?.();
    }
  };

  // Auto-scroll logs to bottom as new lines stream in
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [liveStatus?.live?.recentLogs?.length]);

  const reset = () => {
    setPrompt('');
    setStep('prompt');
    setIntent(null);
    setTargets(null);
    setApprovalData(null);
    setExecution(null);
    setLiveStatus(null);
    setError(null);
    setSubsteps({
      parsing: { status: 'pending', message: 'Analyzing your request...' },
      finding: { status: 'pending', message: 'Searching for targets...' },
      executing: { status: 'pending', message: 'Starting workflow...' },
    });
  };

  const StepIcon = ({ status }: { status: SubStep['status'] }) => {
    switch (status) {
      case 'complete': return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />;
      case 'running': return <Loader2 className="h-4 w-4 text-brand animate-spin shrink-0" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />;
      default: return <Circle className="h-4 w-4 text-gray-300 shrink-0" />;
    }
  };

  const formatRelativeTime = (ts: string) => {
    const mins = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[5vh] overflow-y-auto pb-10">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={step !== 'processing' && step !== 'executing' ? onClose : undefined} />

      <div className="relative w-full max-w-[720px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 mx-4">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-start justify-between border-b border-default">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-brand/10 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-brand" />
              </div>
              <h2 className="text-lg font-semibold text-heading">
                {step === 'live-progress' ? 'Workflow In Progress' : step === 'success' ? 'Workflow Launched' : step === 'approval' ? 'Review & Approve' : 'Workflow Creator'}
              </h2>
            </div>
            <p className="text-sm text-subtle">
              {step === 'prompt' && 'Describe what you want to do in plain English.'}
              {step === 'processing' && 'Processing your workflow request...'}
              {step === 'no-targets' && 'No matching contacts were found.'}
              {step === 'approval' && 'Review the targets and approve execution.'}
              {step === 'executing' && 'Executing your approved workflow...'}
              {step === 'success' && 'Your workflow has been launched successfully.'}
              {step === 'live-progress' && (liveStatus?.workflowName || 'Monitoring active workflow execution.')}
            </p>
          </div>
          {step !== 'processing' && step !== 'executing' && (
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">

          {/* Error Banner */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-red-800">{error.title}</p>
                <p className="text-xs text-red-600 mt-0.5">{error.suggestion}</p>
              </div>
              <button onClick={() => setError(null)} className="p-0.5 text-red-400 hover:text-red-600">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* ──── STEP: PROMPT ──── */}
          {step === 'prompt' && (
            <>
              <div className="grid grid-cols-2 gap-4 bg-gray-50/50 border border-gray-100 rounded-xl p-5">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="h-4 w-4 text-brand" />
                    <h3 className="text-sm font-semibold text-brand">Client Check-ins</h3>
                  </div>
                  <ul className="space-y-2.5">
                    {[
                      '"Call Andreja Andrejevic about the "Ten Brinke (DE), Operating Model 2026" deal.',
                      '"Client check in with Tamirat for BarrierX deal"',
                      '"Schedule check-in with the owner of Wesgroup deal"',
                    ].map((t) => (
                      <li key={t} className="text-sm text-gray-600 flex items-start gap-2 cursor-pointer hover:text-heading transition-colors" onClick={() => setPrompt(t.replace(/"/g, ''))}>
                        <span className="w-1 h-1 rounded-full bg-brand/40 mt-2 shrink-0" />
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart2 className="h-4 w-4 text-brand" />
                    <h3 className="text-sm font-semibold text-brand">Filter by Deal Stage</h3>
                  </div>
                  <ul className="space-y-2.5">
                    {[
                      '"Call all owners of Lost deals"',
                      '"Call everyone with deals in Negotiation"',
                      '"Call owners of Closed Lost deals to ask why"',
                    ].map((t) => (
                      <li key={t} className="text-sm text-gray-600 flex items-start gap-2 cursor-pointer hover:text-heading transition-colors" onClick={() => setPrompt(t.replace(/"/g, ''))}>
                        <span className="w-1 h-1 rounded-full bg-brand/40 mt-2 shrink-0" />
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Example: Call Andreja about his Bosa Properties deal..."
                  className="w-full min-h-[100px] p-4 text-sm bg-white border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand placeholder:text-gray-400 transition-colors"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && prompt.trim()) runWorkflow();
                  }}
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <p className="text-[11px] text-subtle">Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-mono border border-gray-200">Ctrl+Enter</kbd> to run</p>
                <Button
                  onClick={runWorkflow}
                  disabled={!prompt.trim()}
                  className={cn(
                    'gap-2 px-5 py-2.5 h-auto font-medium rounded-lg transition-all',
                    prompt.trim() ? 'bg-brand hover:bg-brand-hover text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  )}
                >
                  <Sparkles className="h-4 w-4" />
                  Preview Workflow
                </Button>
              </div>
            </>
          )}

          {/* ──── STEP: PROCESSING ──── */}
          {step === 'processing' && (
            <div className="py-6 space-y-6">
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div className="bg-brand h-2 rounded-full transition-all duration-700 ease-out animate-pulse" style={{ width: '60%' }} />
              </div>
              <div className="space-y-3">
                {Object.entries(substeps).map(([key, info]) => (
                  <div key={key} className="flex items-center gap-3">
                    <StepIcon status={info.status} />
                    <span className={cn(
                      'text-sm',
                      info.status === 'complete' && 'text-emerald-700 font-medium',
                      info.status === 'running' && 'text-heading font-medium',
                      info.status === 'error' && 'text-red-600',
                      info.status === 'pending' && 'text-subtle',
                    )}>
                      {info.message}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ──── STEP: NO TARGETS ──── */}
          {step === 'no-targets' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">No Targets Found</p>
                  <p className="text-xs text-amber-700 mt-1">{targets?.summary}</p>
                </div>
              </div>

              {targets?.suggestions && targets.suggestions.length > 0 && (
                <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4">
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">Try these suggestions</p>
                  <ul className="space-y-1.5">
                    {targets.suggestions.map((s, i) => (
                      <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                        <span className="text-amber-400 mt-1">•</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {intent && (
                <div className="bg-gray-50 border border-default rounded-xl p-4">
                  <p className="text-[11px] font-semibold text-subtle uppercase tracking-wider mb-2">SEARCH CRITERIA USED</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(intent.target_criteria)
                      .filter(([, v]) => v)
                      .map(([key, value]) => (
                        <span key={key} className="inline-flex px-2.5 py-1 bg-white border border-default rounded-lg text-xs text-heading">
                          <span className="text-subtle mr-1">{key}:</span>
                          {Array.isArray(value) ? value.join(', ') : String(value)}
                        </span>
                      ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={reset} className="gap-2 h-9 text-sm border-default">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {/* ──── STEP: APPROVAL ──── */}
          {step === 'approval' && approvalData && (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-4 bg-blue-50 border border-blue-100 rounded-xl">
                  <Users className="h-4 w-4 text-blue-500 mx-auto mb-1.5" />
                  <p className="text-2xl font-bold text-blue-700">{approvalData.targets.count}</p>
                  <p className="text-[11px] text-blue-500 font-medium">Targets</p>
                </div>
                <div className="text-center p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                  <DollarSign className="h-4 w-4 text-emerald-500 mx-auto mb-1.5" />
                  <p className="text-2xl font-bold text-emerald-700">${approvalData.estimatedCost.estimatedCostUSD}</p>
                  <p className="text-[11px] text-emerald-500 font-medium">Est. Cost</p>
                </div>
                <div className="text-center p-4 bg-purple-50 border border-purple-100 rounded-xl">
                  <Clock className="h-4 w-4 text-purple-500 mx-auto mb-1.5" />
                  <p className="text-2xl font-bold text-purple-700">{approvalData.estimatedCost.estimatedDuration}m</p>
                  <p className="text-[11px] text-purple-500 font-medium">Est. Duration</p>
                </div>
              </div>

              {approvalData.targets.count > 10 && (
                <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Large Batch Warning</p>
                    <p className="text-xs text-red-600 mt-0.5">
                      You're about to initiate {approvalData.targets.count} calls costing ~${approvalData.estimatedCost.estimatedCostUSD} and taking ~{approvalData.estimatedCost.estimatedDuration} min.
                    </p>
                  </div>
                </div>
              )}

              <div>
                <p className="text-[11px] font-semibold text-subtle uppercase tracking-wider mb-2">TARGET PREVIEW</p>
                <div className="bg-white border border-default rounded-xl divide-y divide-default max-h-48 overflow-y-auto">
                  {approvalData.targets.sample.map((t, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-heading">{t.name.charAt(0)}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-heading truncate">{t.name}</p>
                          <p className="text-xs text-subtle truncate">{t.dealName}{t.company ? ` · ${t.company}` : ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-subtle shrink-0 ml-2">
                        <Phone className="h-3 w-3" />
                        {t.phone}
                      </div>
                    </div>
                  ))}
                  {approvalData.targets.count > approvalData.targets.sample.length && (
                    <div className="px-4 py-2.5 text-center text-xs text-subtle">
                      + {approvalData.targets.count - approvalData.targets.sample.length} more targets
                    </div>
                  )}
                </div>
              </div>

              <div>
                <button
                  onClick={() => setScriptExpanded(!scriptExpanded)}
                  className="flex items-center justify-between w-full text-left"
                >
                  <p className="text-[11px] font-semibold text-subtle uppercase tracking-wider">CALL SCRIPT</p>
                  {scriptExpanded ? <ChevronUp className="h-3.5 w-3.5 text-subtle" /> : <ChevronDown className="h-3.5 w-3.5 text-subtle" />}
                </button>
                {scriptExpanded && (
                  <div className="mt-2 bg-gray-50 border border-default rounded-xl p-4 space-y-2.5">
                    <div>
                      <p className="text-[11px] font-medium text-subtle uppercase tracking-wider">Opening</p>
                      <p className="text-sm text-heading mt-0.5">{approvalData.intent.script.opening}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-subtle uppercase tracking-wider">Main Ask</p>
                      <p className="text-sm text-heading mt-0.5">{approvalData.intent.script.main_ask}</p>
                    </div>
                    {approvalData.intent.script.context && (
                      <div>
                        <p className="text-[11px] font-medium text-subtle uppercase tracking-wider">Context</p>
                        <p className="text-sm text-heading mt-0.5">{approvalData.intent.script.context}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ──── STEP: EXECUTING ──── */}
          {step === 'executing' && (
            <div className="py-8 flex flex-col items-center gap-4">
              <Loader2 className="h-10 w-10 text-brand animate-spin" />
              <div className="text-center">
                <p className="text-sm font-medium text-heading">Executing workflow...</p>
                <p className="text-xs text-subtle mt-1">Submitting calls to ElevenLabs</p>
              </div>
            </div>
          )}

          {/* ──── STEP: LIVE PROGRESS ──── */}
          {step === 'live-progress' && (
            <div className="space-y-5">
              <div className="flex items-center gap-4 p-4 bg-brand/5 border border-brand/20 rounded-xl">
                <Loader2 className="h-8 w-8 text-brand animate-spin shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-heading truncate">{liveStatus?.workflowName || 'Workflow Running'}</p>
                  <p className="text-xs text-subtle mt-0.5">
                    Started {liveStatus?.startedAt ? formatRelativeTime(liveStatus.startedAt) : 'recently'}
                    {liveStatus?.live && (
                      <> &middot; Batch <span className="font-semibold text-heading">{liveStatus.live.currentBatch}</span> / {liveStatus.live.totalBatches}</>
                    )}
                  </p>
                </div>
                <span className="inline-flex px-2.5 py-1 bg-brand/10 text-brand text-xs font-semibold rounded-lg">
                  {liveStatus?.status || 'RUNNING'}
                </span>
              </div>

              {liveStatus?.live?.lastError && (
                <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{liveStatus.live.lastError}</p>
                </div>
              )}

              {liveStatus && (
                <>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="text-center p-3 bg-blue-50 border border-blue-100 rounded-xl">
                      <p className="text-xl font-bold text-blue-700">{liveStatus.totalTargets}</p>
                      <p className="text-[10px] text-blue-500 font-medium uppercase tracking-wider">Total</p>
                    </div>
                    <div className="text-center p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                      <p className="text-xl font-bold text-emerald-700">{liveStatus.callsCompleted}</p>
                      <p className="text-[10px] text-emerald-500 font-medium uppercase tracking-wider">Completed</p>
                    </div>
                    <div className="text-center p-3 bg-red-50 border border-red-100 rounded-xl">
                      <p className="text-xl font-bold text-red-700">{liveStatus.callsFailed}</p>
                      <p className="text-[10px] text-red-500 font-medium uppercase tracking-wider">Failed</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 border border-gray-200 rounded-xl">
                      <p className="text-xl font-bold text-gray-700">{liveStatus.callsCancelled ?? liveStatus.live?.cancelledTargets ?? 0}</p>
                      <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Cancelled</p>
                    </div>
                  </div>

                  {liveStatus.totalTargets > 0 && (
                    <div>
                      <div className="flex items-center justify-between text-xs text-subtle mb-1.5">
                        <span>Progress</span>
                        <span>
                          {liveStatus.callsCompleted + liveStatus.callsFailed + (liveStatus.callsCancelled || 0)} / {liveStatus.totalTargets}
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-brand h-2.5 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.round(((liveStatus.callsCompleted + liveStatus.callsFailed + (liveStatus.callsCancelled || 0)) / liveStatus.totalTargets) * 100))}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Per-target status list */}
                  {liveStatus.live?.currentTargets && liveStatus.live.currentTargets.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold text-subtle uppercase tracking-wider mb-2">TARGETS</p>
                      <div className="bg-white border border-default rounded-xl divide-y divide-default max-h-56 overflow-y-auto">
                        {liveStatus.live.currentTargets.map((t, i) => (
                          <TargetRow key={`${t.phone}-${i}`} target={t} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent engine logs */}
                  {liveStatus.live?.recentLogs && liveStatus.live.recentLogs.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold text-subtle uppercase tracking-wider mb-2">ENGINE LOG</p>
                      <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 max-h-48 overflow-y-auto font-mono text-[11px] leading-relaxed text-gray-200">
                        {liveStatus.live.recentLogs.map((line, i) => (
                          <div key={i} className="whitespace-pre-wrap break-all">{line}</div>
                        ))}
                        <div ref={logsEndRef} />
                      </div>
                    </div>
                  )}

                  <div className="bg-gray-50 border border-default rounded-xl p-3">
                    <p className="text-[11px] font-medium text-subtle uppercase tracking-wider">Execution ID</p>
                    <code className="text-[11px] font-mono text-heading mt-0.5 block truncate">{liveStatus.id}</code>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ──── STEP: SUCCESS ──── */}
          {step === 'success' && (
            <div className="space-y-5">
              <div className="flex flex-col items-center text-center py-4">
                <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                  <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                </div>
                <p className="text-lg font-semibold text-heading">
                  {hasActiveExec && !liveStatus ? 'Workflow Completed' : 'Workflow Launched!'}
                </p>
                <p className="text-sm text-subtle mt-1">
                  {hasActiveExec && !liveStatus
                    ? 'All calls have finished.'
                    : `Calls are being made to ${targets?.count || activeExecution?.totalTargets || '?'} target(s).`
                  }
                </p>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <p className="text-sm font-medium text-emerald-800">
                    {hasActiveExec && !liveStatus ? 'Calls completed' : 'Calls in progress'}
                  </p>
                </div>
                <p className="text-xs text-emerald-600">
                  You can monitor progress in the Calls tab. Results will appear as calls complete.
                </p>
              </div>

              {execution && (
                <div className="bg-gray-50 border border-default rounded-xl p-4">
                  <p className="text-[11px] font-medium text-subtle uppercase tracking-wider">Execution ID</p>
                  <code className="text-[11px] font-mono text-heading mt-0.5 block truncate">{execution.id}</code>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {(step === 'approval' || step === 'success' || step === 'live-progress') && (
          <div className="px-6 py-4 border-t border-default flex items-center justify-between bg-gray-50/50">
            {step === 'approval' && (
              <>
                <Button variant="outline" onClick={reset} className="h-9 text-sm border-default">
                  Cancel
                </Button>
                <Button
                  onClick={executeApproved}
                  className="gap-2 h-9 text-sm bg-brand hover:bg-brand-hover text-white"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Approve & Execute
                </Button>
              </>
            )}
            {step === 'live-progress' && (
              <>
                <Button variant="outline" onClick={onClose} className="h-9 text-sm border-default">
                  Close
                </Button>
                <Button
                  onClick={handleCancel}
                  disabled={isCancelling}
                  className="gap-2 h-9 text-sm bg-red-500 hover:bg-red-600 text-white"
                >
                  {isCancelling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Square className="h-3.5 w-3.5" />}
                  Cancel Workflow
                </Button>
              </>
            )}
            {step === 'success' && (
              <>
                <Button variant="outline" onClick={reset} className="h-9 text-sm border-default gap-2">
                  <Sparkles className="h-3.5 w-3.5" />
                  New Workflow
                </Button>
                <Button onClick={onClose} className="h-9 text-sm bg-brand hover:bg-brand-hover text-white">
                  Done
                </Button>
              </>
            )}
          </div>
        )}

        {step === 'approval' && (
          <div className="px-6 pb-4">
            <p className="text-[11px] text-subtle text-center">
              By clicking "Approve & Execute", you authorize the system to make calls to the specified contacts.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const TARGET_STATUS_META: Record<
  LiveTargetStatus,
  { label: string; icon: React.ElementType; cls: string; pulse?: boolean }
> = {
  PENDING: { label: 'Queued', icon: Circle, cls: 'text-gray-400 bg-gray-50 border-gray-200' },
  CALLING: { label: 'Dialing', icon: PhoneCall, cls: 'text-brand bg-brand/10 border-brand/20', pulse: true },
  INITIATED: { label: 'In call', icon: PhoneCall, cls: 'text-amber-600 bg-amber-50 border-amber-200', pulse: true },
  COMPLETED: { label: 'Completed', icon: CheckCircle2, cls: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  FAILED: { label: 'Failed', icon: XCircle, cls: 'text-red-600 bg-red-50 border-red-200' },
  CANCELLED: { label: 'Cancelled', icon: Ban, cls: 'text-gray-500 bg-gray-50 border-gray-200' },
};

function TargetRow({ target }: { target: LiveTargetInfo }) {
  const meta = TARGET_STATUS_META[target.status] || TARGET_STATUS_META.PENDING;
  const Icon = meta.icon;
  return (
    <div className="flex items-center justify-between px-4 py-2.5 gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-heading">{(target.name || '?').charAt(0).toUpperCase()}</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-heading truncate">{target.name || 'Unknown'}</p>
          <p className="text-[11px] text-subtle truncate">
            {target.dealName || '—'}
            {target.company ? ` · ${target.company}` : ''}
            {target.phone ? ` · ${target.phone}` : ''}
          </p>
          {target.error && <p className="text-[11px] text-red-500 truncate mt-0.5">{target.error}</p>}
        </div>
      </div>
      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 border rounded-md text-[11px] font-medium shrink-0', meta.cls)}>
        <Icon className={cn('h-3 w-3', meta.pulse && 'animate-pulse')} />
        {meta.label}
      </span>
    </div>
  );
}

export default AddWorkflowModal;
