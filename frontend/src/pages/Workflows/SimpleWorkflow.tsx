import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, Search, Users, CheckCircle, Circle, AlertCircle, AlertTriangle, RotateCcw, ChevronDown, Info } from 'lucide-react';
import api from '@/services/api';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface SimpleIntent {
  action: string;
  target_criteria: {
    contact_name?: string;
    deal_name?: string;
    company?: string;
    deal_stage?: string;
    deal_min_amount?: number;
    deal_max_amount?: number;
    tenant_slug?: string;
    keywords?: string[];
  };
  script: {
    opening: string;
    main_ask: string;
    context?: string;
  };
  goal: string;
}

interface Target {
  name: string;
  phone: string;
  email?: string;
  dealId: string;
  dealName: string;
  dealStage?: string;
  dealAmount?: number;
  company?: string;
}

export default function SimpleWorkflow() {
  const [prompt, setPrompt] = useState('');
  const [intent, setIntent] = useState<SimpleIntent | null>(null);
  const [intentSummary, setIntentSummary] = useState('');
  const [targets, setTargets] = useState<{
    count: number;
    sample: Target[];
    summary: string;
    suggestions?: string[];
  } | null>(null);
  const [execution, setExecution] = useState<{
    id: string;
    batchId: string;
  } | null>(null);

  const [approvalData, setApprovalData] = useState<{
    intent: SimpleIntent;
    targets: { count: number; sample: Target[]; summary: string };
    estimatedCost: { estimatedCalls: number; estimatedCostUSD: number; estimatedDuration: number };
    requiresApproval: boolean;
  } | null>(null);

  const [loading, setLoading] = useState({
    parsing: false,
    finding: false,
    executing: false,
    running: false,
  });

  const [progress, setProgress] = useState({
    step: 'idle' as 'idle' | 'parsing' | 'validating' | 'finding' | 'filtering' | 'executing' | 'submitting' | 'complete',
    percentage: 0,
    message: '',
    substeps: {
      parsing: { status: 'pending' as 'pending' | 'running' | 'complete' | 'error', message: 'Analyzing your request...' },
      finding: { status: 'pending' as 'pending' | 'running' | 'complete' | 'error' | 'warning', message: 'Searching for targets...' },
      executing: { status: 'pending' as 'pending' | 'running' | 'complete' | 'error' | 'cancelled', message: 'Starting workflow...' }
    }
  });

  // Step 1: Parse Intent
  const parseIntent = async () => {
    if (!prompt.trim()) return;

    setLoading(prev => ({ ...prev, parsing: true }));
    setProgress(prev => ({
      ...prev,
      step: 'parsing',
      percentage: 10,
      message: 'Analyzing your request with AI...',
      substeps: {
        ...prev.substeps,
        parsing: { status: 'running', message: 'Processing natural language...' }
      }
    }));

    try {
      const response = await api.post('/workflows/parse-intent', { prompt });

      setProgress(prev => ({
        ...prev,
        step: 'validating',
        percentage: 30,
        message: 'Validating parsed intent...',
        substeps: {
          ...prev.substeps,
          parsing: { status: 'complete', message: 'Intent parsed successfully!' }
        }
      }));

      setIntent(response.data.intent);
      setIntentSummary(response.data.summary);

      setProgress(prev => ({
        ...prev,
        step: 'idle',
        percentage: 100,
        message: 'Ready for next step',
      }));
    } catch (error: any) {
      console.error('Failed to parse intent:', error);
      setProgress(prev => ({
        ...prev,
        step: 'idle',
        percentage: 0,
        message: 'Parse failed',
        substeps: {
          ...prev.substeps,
          parsing: { status: 'error', message: 'Failed to parse intent' }
        }
      }));
      showUserFriendlyError('parse intent', error);
    } finally {
      setLoading(prev => ({ ...prev, parsing: false }));
    }
  };

  // Step 2: Find Targets
  const findTargets = async () => {
    if (!intent) return;

    setLoading(prev => ({ ...prev, finding: true }));
    setProgress(prev => ({
      ...prev,
      step: 'finding',
      percentage: 40,
      message: 'Searching contact database...',
      substeps: {
        ...prev.substeps,
        finding: { status: 'running', message: 'Filtering contacts by criteria...' }
      }
    }));

    try {
      const response = await api.post('/workflows/find-targets', { intent });

      // Handle no targets found case
      if (response.data.noTargetsFound) {
        setProgress(prev => ({
          ...prev,
          step: 'idle',
          percentage: 100,
          message: 'No targets found',
          substeps: {
            ...prev.substeps,
            finding: { status: 'warning', message: 'No targets match your criteria' }
          }
        }));

        setTargets({
          count: 0,
          sample: [],
          summary: response.data.targets.summary,
          suggestions: response.data.suggestions
        });
        return;
      }

      setProgress(prev => ({
        ...prev,
        step: 'filtering',
        percentage: 70,
        message: 'Processing search results...',
        substeps: {
          ...prev.substeps,
          finding: { status: 'complete', message: `Found ${response.data.targets.count} target${response.data.targets.count === 1 ? '' : 's'}!` }
        }
      }));

      setTargets(response.data.targets);

      setProgress(prev => ({
        ...prev,
        step: 'idle',
        percentage: 100,
        message: 'Ready to execute',
      }));
    } catch (error: any) {
      console.error('Failed to find targets:', error);
      setProgress(prev => ({
        ...prev,
        step: 'idle',
        percentage: 0,
        message: 'Search failed',
        substeps: {
          ...prev.substeps,
          finding: { status: 'error', message: 'Failed to find targets' }
        }
      }));
      showUserFriendlyError('find targets', error);
    } finally {
      setLoading(prev => ({ ...prev, finding: false }));
    }
  };


  // All-in-one: Run Complete Workflow
  const runCompleteWorkflow = async () => {
    if (!prompt.trim()) return;

    setLoading(prev => ({ ...prev, running: true }));
    setProgress(prev => ({
      ...prev,
      step: 'parsing',
      percentage: 20,
      message: 'Processing your request...',
      substeps: {
        ...prev.substeps,
        parsing: { status: 'running', message: 'Analyzing prompt with AI...' }
      }
    }));

    try {
      const response = await api.post('/workflows/run-simple', {
        prompt,
        workflowName: `Simple Workflow - ${new Date().toLocaleString()}`
      });

      setIntent(response.data.intent);
      setIntentSummary(response.data.intentSummary);
      setTargets(response.data.targets);

      // Handle no targets found case
      if (response.data.noTargetsFound) {
        setProgress(prev => ({
          ...prev,
          step: 'idle',
          percentage: 100,
          message: 'No targets found',
          substeps: {
            parsing: { status: 'complete', message: 'Intent parsed successfully!' },
            finding: { status: 'warning', message: 'No targets match your criteria' },
            executing: { status: 'cancelled', message: 'Cannot execute without targets' }
          }
        }));
        return;
      }

      // Set approval data (NO AUTO-EXECUTION)
      if (response.data.requiresApproval) {
        setApprovalData({
          intent: response.data.intent,
          targets: response.data.targets,
          estimatedCost: response.data.estimatedCost,
          requiresApproval: true,
        });

        setProgress(prev => ({
          ...prev,
          step: 'idle',
          percentage: 100,
          message: 'Ready for approval',
          substeps: {
            parsing: { status: 'complete', message: 'Intent parsed successfully!' },
            finding: { status: 'complete', message: `Found ${response.data.targets.count} targets!` },
            executing: { status: 'pending', message: 'Awaiting approval...' }
          }
        }));
      }
    } catch (error: any) {
      console.error('Failed to run complete workflow:', error);
      setProgress(prev => ({
        ...prev,
        step: 'idle',
        percentage: 0,
        message: 'Workflow failed',
        substeps: {
          ...prev.substeps,
          parsing: { status: 'error', message: 'Failed to process workflow' }
        }
      }));
      showUserFriendlyError('execute workflow', error);
    } finally {
      setLoading(prev => ({ ...prev, running: false }));
    }
  };

  // Execute after approval
  const executeApprovedWorkflow = async () => {
    if (!approvalData) return;

    setLoading(prev => ({ ...prev, executing: true }));
    setProgress(prev => ({
      ...prev,
      step: 'executing',
      percentage: 90,
      message: 'Executing approved workflow...',
      substeps: {
        ...prev.substeps,
        executing: { status: 'running', message: 'Submitting calls to ElevenLabs...' }
      }
    }));

    try {
      const response = await api.post('/workflows/approve-and-execute', {
        intent: approvalData.intent,
        workflowName: `Approved Workflow - ${new Date().toLocaleString()}`,
        userConfirmation: true,
        estimatedCost: approvalData.estimatedCost,
      });

      setExecution({
        id: response.data.execution.id,
        batchId: response.data.execution.batchId,
      });

      setProgress(prev => ({
        ...prev,
        step: 'complete',
        percentage: 100,
        message: 'Workflow executed successfully!',
        substeps: {
          ...prev.substeps,
          executing: { status: 'complete', message: 'Calls initiated successfully!' }
        }
      }));

      // Clear approval data after execution
      setApprovalData(null);
    } catch (error: any) {
      console.error('Failed to execute approved workflow:', error);
      setProgress(prev => ({
        ...prev,
        step: 'idle',
        percentage: 0,
        message: 'Execution failed',
        substeps: {
          ...prev.substeps,
          executing: { status: 'error', message: 'Failed to execute workflow' }
        }
      }));
      showUserFriendlyError('execute workflow', error);
    } finally {
      setLoading(prev => ({ ...prev, executing: false }));
    }
  };

  // User-friendly error handler
  const showUserFriendlyError = (operation: string, error: any) => {
    const errorMessage = error.response?.data?.error || error.message;

    let userMessage = '';
    let suggestion = '';

    switch (operation) {
      case 'parse intent':
        if (errorMessage.includes('security') || errorMessage.includes('injection')) {
          userMessage = 'Your prompt contains potentially unsafe content.';
          suggestion = 'Try rephrasing your request in simpler terms.';
        } else if (errorMessage.includes('timeout')) {
          userMessage = 'The AI is taking too long to process your request.';
          suggestion = 'Try a shorter, more specific prompt.';
        } else {
          userMessage = 'We couldn\'t understand your request.';
          suggestion = 'Try being more specific about who to call and why.';
        }
        break;

      case 'find targets':
        if (errorMessage.includes('No targets found')) {
          userMessage = 'No matching contacts were found.';
          suggestion = 'Try broader criteria or check if the contact/company name is correct.';
        } else {
          userMessage = 'There was an issue searching for contacts.';
          suggestion = 'Please try again in a moment.';
        }
        break;

      case 'execute workflow':
        if (errorMessage.includes('authentication') || errorMessage.includes('token')) {
          userMessage = 'Your session has expired.';
          suggestion = 'Please refresh the page and log in again.';
        } else if (errorMessage.includes('ElevenLabs')) {
          userMessage = 'There was an issue starting the calls.';
          suggestion = 'The calling service may be temporarily unavailable.';
        } else {
          userMessage = 'Failed to start the workflow.';
          suggestion = 'Please try again or contact support if the issue persists.';
        }
        break;

      default:
        userMessage = 'Something went wrong.';
        suggestion = 'Please try again or contact support if the issue continues.';
    }

    // Create a more user-friendly error display
    const errorDiv = document.createElement('div');
    errorDiv.className = 'fixed top-4 right-4 bg-red-50 border border-red-200 rounded-lg p-4 max-w-md z-50';
    errorDiv.innerHTML = `
      <div class="flex items-start gap-3">
        <div class="flex-shrink-0">
          <svg class="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
          </svg>
        </div>
        <div class="flex-1">
          <h3 class="text-sm font-medium text-red-800">${userMessage}</h3>
          <p class="text-sm text-red-700 mt-1">${suggestion}</p>
        </div>
        <button onclick="this.parentElement.parentElement.remove()" class="flex-shrink-0 text-red-400 hover:text-red-600">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
          </svg>
        </button>
      </div>
    `;

    document.body.appendChild(errorDiv);

    // Auto-remove after 8 seconds
    setTimeout(() => {
      if (errorDiv.parentElement) {
        errorDiv.remove();
      }
    }, 8000);
  };

  const reset = () => {
    setIntent(null);
    setIntentSummary('');
    setTargets(null);
    setExecution(null);
    setApprovalData(null);
    setProgress({
      step: 'idle',
      percentage: 0,
      message: '',
      substeps: {
        parsing: { status: 'pending', message: 'Analyzing your request...' },
        finding: { status: 'pending', message: 'Searching for targets...' },
        executing: { status: 'pending', message: 'Starting workflow...' }
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Workflow</h1>
          <p className="text-muted-foreground">
            Natural language to Workflow Execution
          </p>
        </div>
        {(intent || targets || execution) && (
          <Button variant="outline" onClick={reset}>
            Reset
          </Button>
        )}
      </div>

      {/* Supported Prompts Guide */}
      <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-blue-800 dark:text-blue-300">
            <Info className="w-4 h-4" />
            Supported Prompt Examples
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium text-blue-900 dark:text-blue-200">Call Specific People or Deals</h4>
              <ul className="space-y-1 text-blue-700 dark:text-blue-400 list-disc pl-4">
                <li>"Call <strong>Andreja</strong> about the <strong>Bosa Properties</strong> deal"</li>
                <li>"Call <strong>Tamirat</strong> and ask about the <strong>BarrierX</strong> deal"</li>
                <li>"Call the owner of the <strong>Wesgroup</strong> deal"</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-blue-900 dark:text-blue-200">Filter by Deal Stage</h4>
              <ul className="space-y-1 text-blue-700 dark:text-blue-400 list-disc pl-4">
                <li>"Call all owners of <strong>Lost</strong> deals"</li>
                <li>"Call everyone with deals in <strong>Negotiation</strong>"</li>
                <li>"Call owners of <strong>Closed Lost</strong> deals to ask why"</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-blue-200 dark:border-blue-800"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-blue-50 dark:bg-blue-950/20 px-3 text-xs text-blue-600 dark:text-blue-400">
                More prompt patterns will be supported soon
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Indicator */}
      {(loading.parsing || loading.finding || loading.executing || loading.running) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing Workflow
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-500 ease-out dark:bg-blue-500"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>

            {/* Current step message */}
            <p className="text-sm text-gray-600 font-medium dark:text-gray-300">{progress.message}</p>

            {/* Step-by-step progress */}
            <div className="space-y-3">
              {Object.entries(progress.substeps).map(([step, info]) => (
                <div key={step} className="flex items-center gap-3">
                  {info.status === 'complete' && <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 dark:text-green-400" />}
                  {info.status === 'running' && <Loader2 className="w-5 h-5 animate-spin text-blue-500 flex-shrink-0 dark:text-blue-400" />}
                  {info.status === 'error' && <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 dark:text-red-400" />}
                  {info.status === 'pending' && <Circle className="w-5 h-5 text-gray-300 flex-shrink-0 dark:text-gray-600" />}
                  <span className={`text-sm ${info.status === 'complete' ? 'text-green-700 font-medium dark:text-green-400' :
                    info.status === 'error' ? 'text-red-700 dark:text-red-400' :
                      info.status === 'running' ? 'text-blue-700 font-medium dark:text-blue-400' :
                        'text-gray-500 dark:text-gray-500'
                    }`}>
                    {info.message}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 0: Prompt Input */}
      <Card>
        <CardHeader>
          <CardTitle>Natural Language Prompt</CardTitle>
          <CardDescription>
            Describe what you want to do in plain English
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Example: Call Andreja about his Bosa Properties deal..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
          />
          <div className="flex gap-2">
            <Button
              onClick={parseIntent}
              disabled={!prompt.trim() || loading.parsing}
              className="bg-[#ff9447] hover:bg-[#ff9447]/90 text-white"
            >
              {loading.parsing ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              Parse Intent
            </Button>
            <Button
              onClick={runCompleteWorkflow}
              disabled={!prompt.trim() || loading.running}
              className="ml-auto"
            >
              {loading.running ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Preview Workflow
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Step 1: Intent Results */}
      {intent && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Parsed Intent
            </CardTitle>
            <CardDescription>{intentSummary}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Action</h4>
                <p className="text-sm text-muted-foreground">{intent.action}</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Goal</h4>
                <p className="text-sm text-muted-foreground">{intent.goal}</p>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Target Criteria</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(intent.target_criteria).map(([key, value]) =>
                  value ? (
                    <Badge key={key} variant="outline">
                      {key}: {Array.isArray(value) ? value.join(', ') : value}
                    </Badge>
                  ) : null
                )}
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Script</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Opening:</span> {intent.script.opening}
                </div>
                <div>
                  <span className="font-medium">Main Ask:</span> {intent.script.main_ask}
                </div>
                {intent.script.context && (
                  <div>
                    <span className="font-medium">Context:</span> {intent.script.context}
                  </div>
                )}
              </div>
            </div>

            <Button
              onClick={findTargets}
              disabled={loading.finding}
              className="bg-[#ff9447] hover:bg-[#ff9447]/90 text-white"
            >
              {loading.finding ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Users className="w-4 h-4 mr-2" />
              )}
              Find Targets
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Targets Results */}
      {targets && (
        <>
          {targets.count === 0 ? (
            // No Targets Found - Enhanced UX
            <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-500/30">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500" />
                  <CardTitle className="text-amber-800 dark:text-amber-200">No Targets Found</CardTitle>
                </div>
                <CardDescription className="text-amber-700 dark:text-amber-300/80">
                  {targets.summary}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {targets.suggestions && targets.suggestions.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm text-amber-700 font-medium dark:text-amber-300">
                      Try these suggestions to find targets:
                    </p>
                    <ul className="text-sm text-amber-700 space-y-2 ml-4 dark:text-amber-300/90">
                      {targets.suggestions.map((suggestion, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-amber-500 mt-0.5">•</span>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPrompt('');
                      setTargets(null);
                      setIntent(null);
                    }}
                    className="border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/50"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Try Different Criteria
                  </Button>

                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/50">
                        <ChevronDown className="h-4 w-4 mr-2" />
                        Show Search Details
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mt-3 p-3 bg-amber-100 rounded text-xs dark:bg-amber-900/30">
                        <strong className="text-amber-800 dark:text-amber-200">Searched for:</strong>
                        <pre className="mt-1 text-amber-700 whitespace-pre-wrap dark:text-amber-300/80">
                          {intent ? JSON.stringify(intent.target_criteria, null, 2) : 'No search criteria'}
                        </pre>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </CardContent>
            </Card>
          ) : (
            // Targets Found - Existing UI
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Found Targets
                </CardTitle>
                <CardDescription>{targets.summary}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">{targets.count} targets</div>
                  <Badge variant="default">Ready</Badge>
                </div>

                {targets.sample.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Sample Targets</h4>
                    <div className="space-y-2">
                      {targets.sample.map((target, index) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded">
                          <div>
                            <div className="font-medium">{target.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {target.dealName} • {target.company}
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {target.phone}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Approval Gate */}
      {approvalData && !execution && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-zinc-950 dark:border-orange-500/30 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-accent-orange">
              <AlertCircle className="w-5 h-5" />
              Approval Required
            </CardTitle>
            <CardDescription className="text-orange-700 dark:text-orange-300/80">
              Review the workflow details and approve execution before calls are made.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Cost and Impact Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-white rounded-lg border dark:bg-zinc-900 dark:border-zinc-800">
                <div className="text-2xl font-bold icon-blue">{approvalData.targets.count}</div>
                <div className="text-sm text-subtle">Targets</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg border dark:bg-zinc-900 dark:border-zinc-800">
                <div className="text-2xl font-bold icon-green">${approvalData.estimatedCost.estimatedCostUSD}</div>
                <div className="text-sm text-subtle">Est. Cost</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg border dark:bg-zinc-900 dark:border-zinc-800">
                <div className="text-2xl font-bold icon-purple">{approvalData.estimatedCost.estimatedDuration}m</div>
                <div className="text-sm text-subtle">Est. Duration</div>
              </div>
            </div>

            {/* Warning for large batches */}
            {approvalData.targets.count > 10 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg dark:bg-red-950/30 dark:border-red-500/30">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-accent-red" />
                  <span className="text-red-800 font-medium dark:text-red-200">Large Batch Warning</span>
                </div>
                <p className="text-red-700 text-sm mt-1 dark:text-red-300/80">
                  You're about to initiate {approvalData.targets.count} calls. This will cost approximately ${approvalData.estimatedCost.estimatedCostUSD} and take about {approvalData.estimatedCost.estimatedDuration} minutes to complete.
                </p>
              </div>
            )}

            {/* Target Preview */}
            <div>
              <h4 className="font-semibold mb-3 text-heading">Target Preview</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {approvalData.targets.sample.map((target, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white border rounded dark:bg-zinc-900 dark:border-zinc-800">
                    <div>
                      <div className="font-medium text-heading">{target.name}</div>
                      <div className="text-sm text-subtle">
                        {target.dealName} • {target.company}
                      </div>
                    </div>
                    <div className="text-sm text-subtle">
                      {target.phone}
                    </div>
                  </div>
                ))}
                {approvalData.targets.count > approvalData.targets.sample.length && (
                  <div className="text-center text-sm text-subtle py-2">
                    ... and {approvalData.targets.count - approvalData.targets.sample.length} more targets
                  </div>
                )}
              </div>
            </div>

            {/* Script Preview */}
            <div>
              <h4 className="font-semibold mb-3 text-heading">Call Script Preview</h4>
              <div className="bg-white border rounded-lg p-4 space-y-2 dark:bg-zinc-900 dark:border-zinc-800">
                <div>
                  <span className="font-medium text-sm text-subtle">Opening:</span>
                  <p className="text-sm text-body">{approvalData.intent.script.opening}</p>
                </div>
                <div>
                  <span className="font-medium text-sm text-subtle">Main Ask:</span>
                  <p className="text-sm text-body">{approvalData.intent.script.main_ask}</p>
                </div>
                {approvalData.intent.script.context && (
                  <div>
                    <span className="font-medium text-sm text-subtle">Context:</span>
                    <p className="text-sm text-body">{approvalData.intent.script.context}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Approval Actions */}
            <div className="flex justify-center gap-4 pt-4 border-t dark:border-zinc-800">
              <Button
                onClick={() => setApprovalData(null)}
                variant="outline"
                className="w-32 dark:bg-zinc-900 dark:border-zinc-700 dark:text-gray-300 dark:hover:bg-zinc-800"
              >
                Cancel
              </Button>
              <Button
                onClick={executeApprovedWorkflow}
                disabled={loading.executing}
                className="w-52 bg-[#ff9447] hover:bg-[#ff9447]/90 text-white border-0"
              >
                {loading.executing ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Approve & Execute
              </Button>
            </div>

            {/* Disclaimer */}
            <div className="text-xs text-subtle text-center pt-2 border-t dark:border-zinc-800">
              By clicking "Approve & Execute", you confirm that you have reviewed the targets and script,
              and authorize the system to make calls to the specified contacts.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Execution Results */}
      {execution && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Workflow Executing
            </CardTitle>
            <CardDescription>
              Calls are being made via ElevenLabs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Execution ID</h4>
                <code className="text-sm bg-muted p-2 rounded block break-all">
                  {execution.id}
                </code>
              </div>
              <div>
                <h4 className="font-semibold mb-2">ElevenLabs Batch ID</h4>
                <code className="text-sm bg-muted p-2 rounded block break-all">
                  {execution.batchId}
                </code>
              </div>
            </div>

            <div className="p-4 bg-green-50 border border-green-200 rounded-lg dark:bg-green-950/30 dark:border-green-500/30">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse dark:bg-green-400"></div>
                <span className="text-green-800 font-medium dark:text-green-200">
                  Workflow started successfully! Calls are being made to {targets?.count} target{targets?.count === 1 ? '' : 's'}.
                </span>
              </div>
              <p className="text-green-700 text-sm mt-1 dark:text-green-300/80">
                You can monitor detailed progress in the Workflow Executions page.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}