import React, { useState, useCallback, useRef } from 'react';
import {
  AlertCircle,
  Check,
  ClipboardCopy,
  Database,
  Filter,
  Loader2,
  Plus,
  Play,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import * as dealService from '../../services/dealService';
import {
  type FilterRow,
  type FilterFieldKey,
  type InvestigationDeal,
  FILTER_FIELDS,
  runInvestigationQuery,
  syntaxHighlightJson,
} from '../../utils/dealFilters';

let rowIdCounter = 0;
function nextRowId() {
  return `fr-${++rowIdCounter}`;
}

const AgentXInvestigations: React.FC = () => {
  const [deals, setDeals] = useState<InvestigationDeal[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filterRows, setFilterRows] = useState<FilterRow[]>([]);
  const [jsonOutput, setJsonOutput] = useState<string>('');
  const [highlightedHtml, setHighlightedHtml] = useState<string>('');
  const [resultCount, setResultCount] = useState<number | null>(null);
  const [queryRan, setQueryRan] = useState(false);
  const [copied, setCopied] = useState(false);

  const preRef = useRef<HTMLPreElement>(null);

  // ── Fetch deals from API ──────────────────────────────────────────
  const fetchDeals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await dealService.getAdminDeals();
      const raw = (response.deals || []) as unknown as InvestigationDeal[];
      setDeals(raw);
      setFetched(true);
      toast.success(`Fetched ${raw.length} deals`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch deals';
      setError(msg);
      toast.error('Failed to fetch deals');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Filter row management ─────────────────────────────────────────
  const usedFields = new Set(filterRows.map(r => r.field));

  const addFilterRow = () => {
    const available = FILTER_FIELDS.filter(f => !usedFields.has(f.key));
    if (available.length === 0) {
      toast.info('All filters are already added');
      return;
    }
    setFilterRows(prev => [
      ...prev,
      { id: nextRowId(), field: available[0].key, value: available[0].inputType === 'boolean' ? 'true' : '' },
    ]);
  };

  const removeFilterRow = (id: string) => {
    setFilterRows(prev => prev.filter(r => r.id !== id));
  };

  const updateFilterField = (id: string, newField: FilterFieldKey) => {
    const config = FILTER_FIELDS.find(f => f.key === newField);
    setFilterRows(prev =>
      prev.map(r => r.id === id ? { ...r, field: newField, value: config?.inputType === 'boolean' ? 'true' : '' } : r)
    );
  };

  const updateFilterValue = (id: string, value: string) => {
    setFilterRows(prev => prev.map(r => r.id === id ? { ...r, value } : r));
  };

  const clearFilters = () => {
    setFilterRows([]);
    setJsonOutput('');
    setHighlightedHtml('');
    setResultCount(null);
    setQueryRan(false);
  };

  // ── Run query ─────────────────────────────────────────────────────
  const runQuery = () => {
    if (!fetched || deals.length === 0) {
      toast.error('Fetch deals first before running a query');
      return;
    }
    const { result, count } = runInvestigationQuery(deals, filterRows);
    const raw = JSON.stringify(result, null, 2);
    setJsonOutput(raw);
    setHighlightedHtml(syntaxHighlightJson(raw));
    setResultCount(count);
    setQueryRan(true);
    setCopied(false);
  };

  // ── Copy JSON ─────────────────────────────────────────────────────
  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(jsonOutput);
      setCopied(true);
      toast.success('JSON copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  // ── Group filter fields by category for the select dropdown ───────
  const fieldsByCategory = FILTER_FIELDS.reduce<Record<string, typeof FILTER_FIELDS>>((acc, f) => {
    if (!acc[f.category]) acc[f.category] = [];
    acc[f.category].push(f);
    return acc;
  }, {});

  const getFieldConfig = (key: FilterFieldKey) => FILTER_FIELDS.find(f => f.key === key);

  // ── Render a filter value input based on field type ────────────────
  const renderValueInput = (row: FilterRow) => {
    const config = getFieldConfig(row.field);
    if (!config) return null;

    switch (config.inputType) {
      case 'boolean':
        return (
          <div className="flex items-center gap-2 flex-1">
            <Badge variant="success" className="text-xs">Active</Badge>
            <span className="text-xs text-subtle dark:text-muted-foreground">{config.cliFlag}</span>
          </div>
        );
      case 'text':
        return (
          <Input
            type="text"
            placeholder={config.placeholder || 'Enter value...'}
            value={row.value}
            onChange={(e) => updateFilterValue(row.id, e.target.value)}
            className="flex-1 h-9 text-sm rounded-lg border-default dark:border-border bg-elevated dark:bg-card"
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            placeholder={config.placeholder || '0'}
            value={row.value}
            onChange={(e) => updateFilterValue(row.id, e.target.value)}
            className="flex-1 h-9 text-sm rounded-lg border-default dark:border-border bg-elevated dark:bg-card"
          />
        );
      case 'date':
        return (
          <Input
            type="date"
            value={row.value}
            onChange={(e) => updateFilterValue(row.id, e.target.value)}
            className="flex-1 h-9 text-sm rounded-lg border-default dark:border-border bg-elevated dark:bg-card"
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-5">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-brand-light dark:bg-primary/15 flex items-center justify-center shadow-sm border border-[hsl(var(--app-brand-muted)/0.3)] dark:border-primary/20">
            <Search className="w-4 h-4 text-brand dark:text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-heading dark:text-foreground">
              AgentX Investigations
            </h1>
            <p className="text-sm text-subtle dark:text-muted-foreground">
              Query deals with filters and view results as JSON
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDeals}
            disabled={loading}
            className="border-default dark:border-border text-subtle dark:text-muted-foreground hover:!bg-gray-100 hover:text-heading dark:hover:!bg-gray-700 dark:hover:text-foreground rounded-lg h-9 text-xs font-medium"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Database className="w-3.5 h-3.5 mr-1.5" />
            )}
            {fetched ? 'Refresh Deals' : 'Fetch Deals'}
          </Button>
          {fetched && (
            <Badge variant="outline" className="text-xs h-7 px-2.5">
              {deals.length} deals loaded
            </Badge>
          )}
        </div>
      </div>

      {/* ── Error ──────────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-500/20 bg-red-50/50 dark:bg-red-950/10 p-4">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* ── Query Builder ──────────────────────────────────────────── */}
      <Card className="bg-elevated dark:bg-card border border-subtle dark:border-border shadow-sm rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-subtle dark:border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-brand dark:text-primary" />
            <h2 className="text-sm font-semibold text-heading dark:text-foreground">Query Builder</h2>
            {filterRows.length > 0 && (
              <Badge variant="secondary" className="text-[11px] h-5 px-1.5">
                {filterRows.length} filter{filterRows.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {filterRows.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-8 text-xs text-subtle hover:text-red-600 dark:hover:text-red-400"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Clear All
              </Button>
            )}
            <Button
              size="sm"
              onClick={runQuery}
              disabled={!fetched || loading}
              className="h-8 text-xs gap-1.5 bg-brand hover:bg-brand-hover text-white shadow-sm"
            >
              <Play className="w-3 h-3" />
              Run Query
            </Button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-3">
          {filterRows.length === 0 && (
            <div className="text-center py-6 text-subtle dark:text-muted-foreground">
              <Filter className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No filters added yet</p>
              <p className="text-xs mt-1">Add filters to narrow down the results, or run without filters to get all deals</p>
            </div>
          )}

          {filterRows.map((row) => {
            const config = getFieldConfig(row.field);
            return (
              <div key={row.id} className="flex items-center gap-3 group">
                {/* Field selector */}
                <Select
                  value={row.field}
                  onValueChange={(val) => updateFilterField(row.id, val as FilterFieldKey)}
                >
                  <SelectTrigger className="w-56 h-9 text-xs rounded-lg border-default dark:border-border bg-elevated dark:bg-card shrink-0">
                    <SelectValue>{config?.label || row.field}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(fieldsByCategory).map(([category, fields]) => (
                      <SelectGroup key={category}>
                        <SelectLabel className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                          {category}
                        </SelectLabel>
                        {fields.map(f => (
                          <SelectItem
                            key={f.key}
                            value={f.key}
                            disabled={usedFields.has(f.key) && f.key !== row.field}
                          >
                            <div className="flex items-center gap-2">
                              <span>{f.label}</span>
                              <span className="text-[10px] text-muted-foreground font-mono">{f.cliFlag}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>

                {/* Value input */}
                {renderValueInput(row)}

                {/* Remove button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFilterRow(row.id)}
                  className="h-9 w-9 p-0 shrink-0 text-subtle hover:text-red-600 dark:hover:text-red-400 opacity-60 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            );
          })}

          {/* Add filter button */}
          <Button
            variant="outline"
            size="sm"
            onClick={addFilterRow}
            disabled={usedFields.size >= FILTER_FIELDS.length}
            className="h-9 text-xs border-dashed border-default dark:border-border text-subtle dark:text-muted-foreground hover:text-heading hover:border-[hsl(var(--text-muted)/0.5)] dark:hover:text-foreground dark:hover:border-border w-full"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Filter
          </Button>
        </div>
      </Card>

      {/* ── JSON Output ────────────────────────────────────────────── */}
      {queryRan && (
        <Card className="bg-elevated dark:bg-card border border-subtle dark:border-border shadow-sm rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-subtle dark:border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <h2 className="text-sm font-semibold text-heading dark:text-foreground">Results</h2>
              {resultCount !== null && (
                <Badge variant="outline" className="text-[11px] h-5 px-1.5 font-mono">
                  {resultCount} {resultCount === 1 ? 'deal' : 'deals'}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copyJson}
                disabled={!jsonOutput}
                className="h-8 text-xs gap-1.5 border-default dark:border-border"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-green-600" />
                    Copied
                  </>
                ) : (
                  <>
                    <ClipboardCopy className="w-3 h-3" />
                    Copy JSON
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={runQuery}
                disabled={!fetched}
                className="h-8 text-xs gap-1.5"
              >
                <RefreshCw className="w-3 h-3" />
                Re-run
              </Button>
            </div>
          </div>

          <div className="relative">
            <pre
              ref={preRef}
              className="json-output overflow-auto text-[13px] leading-relaxed font-mono p-5 max-h-[70vh] bg-[#1e1e2e] text-[#cdd6f4] selection:bg-[#585b70] selection:text-[#cdd6f4]"
              dangerouslySetInnerHTML={{ __html: highlightedHtml }}
            />
          </div>
        </Card>
      )}
    </div>
  );
};

export default AgentXInvestigations;
