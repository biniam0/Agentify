import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, Search, Users } from 'lucide-react';
import api from '@/services/api';
import { Textarea } from '@/components/ui/textarea';

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
  } | null>(null);
  const [execution, setExecution] = useState<{
    id: string;
    batchId: string;
  } | null>(null);
  
  const [loading, setLoading] = useState({
    parsing: false,
    finding: false,
    executing: false,
    running: false,
  });

  // Step 1: Parse Intent
  const parseIntent = async () => {
    if (!prompt.trim()) return;
    
    setLoading(prev => ({ ...prev, parsing: true }));
    try {
      const response = await api.post('/workflows/parse-intent', { prompt });
      setIntent(response.data.intent);
      setIntentSummary(response.data.summary);
    } catch (error: any) {
      console.error('Failed to parse intent:', error);
      alert('Failed to parse intent: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(prev => ({ ...prev, parsing: false }));
    }
  };

  // Step 2: Find Targets
  const findTargets = async () => {
    if (!intent) return;
    
    setLoading(prev => ({ ...prev, finding: true }));
    try {
      const response = await api.post('/workflows/find-targets', { intent });
      setTargets(response.data.targets);
    } catch (error: any) {
      console.error('Failed to find targets:', error);
      alert('Failed to find targets: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(prev => ({ ...prev, finding: false }));
    }
  };

  // Step 3: Execute Workflow
  const executeWorkflow = async () => {
    if (!intent) return;
    
    setLoading(prev => ({ ...prev, executing: true }));
    try {
      const response = await api.post('/workflows/execute-simple', { 
        intent,
        workflowName: intent.action 
      });
      setExecution({
        id: response.data.executionId,
        batchId: response.data.batchId,
      });
    } catch (error: any) {
      console.error('Failed to execute workflow:', error);
      alert('Failed to execute workflow: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(prev => ({ ...prev, executing: false }));
    }
  };

  // All-in-one: Run Complete Workflow
  const runCompleteWorkflow = async () => {
    if (!prompt.trim()) return;
    
    setLoading(prev => ({ ...prev, running: true }));
    try {
      const response = await api.post('/workflows/run-simple', { 
        prompt,
        workflowName: `Simple Workflow - ${new Date().toLocaleString()}`
      });
      
      setIntent(response.data.intent);
      setIntentSummary(response.data.intentSummary);
      setTargets(response.data.targets);
      setExecution(response.data.execution);
    } catch (error: any) {
      console.error('Failed to run complete workflow:', error);
      alert('Failed to run workflow: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(prev => ({ ...prev, running: false }));
    }
  };

  const reset = () => {
    setIntent(null);
    setIntentSummary('');
    setTargets(null);
    setExecution(null);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Simple Workflow MVP</h1>
          <p className="text-muted-foreground">
            Natural language → Intent → Targets → Execution
          </p>
        </div>
        {(intent || targets || execution) && (
          <Button variant="outline" onClick={reset}>
            Reset
          </Button>
        )}
      </div>

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
              variant="outline"
            >
              {loading.parsing ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              1. Parse Intent
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
              Run Complete Workflow
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Step 1: Intent Results */}
      {intent && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge variant="secondary">Step 1</Badge>
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
              variant="outline"
            >
              {loading.finding ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Users className="w-4 h-4 mr-2" />
              )}
              2. Find Targets
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Targets Results */}
      {targets && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge variant="secondary">Step 2</Badge>
              Found Targets
            </CardTitle>
            <CardDescription>{targets.summary}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{targets.count} targets</div>
              <Badge variant={targets.count > 0 ? "default" : "destructive"}>
                {targets.count > 0 ? "Ready" : "No targets"}
              </Badge>
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

            {targets.count > 0 && (
              <Button 
                onClick={executeWorkflow} 
                disabled={loading.executing}
              >
                {loading.executing ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                3. Execute Workflow
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Execution Results */}
      {execution && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge variant="secondary">Step 3</Badge>
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
                <code className="text-sm bg-muted p-2 rounded block">
                  {execution.id}
                </code>
              </div>
              <div>
                <h4 className="font-semibold mb-2">ElevenLabs Batch ID</h4>
                <code className="text-sm bg-muted p-2 rounded block">
                  {execution.batchId}
                </code>
              </div>
            </div>
            
            <div className="p-4 bg-green-50 border border-green-200 rounded">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-800 font-medium">
                  Workflow is running! Calls are being made to {targets?.count} targets.
                </span>
              </div>
              <p className="text-green-700 text-sm mt-1">
                You can monitor progress in the Workflow Executions page.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}