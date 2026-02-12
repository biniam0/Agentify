import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

// --- Stats Header ---
interface StatsHeaderProps {
  atRiskCount: number;
  atRiskLabel: string;
  targetCurrent: number;
  targetMax: number;
  criticalCount: number;
}

export const StatsHeader: React.FC<StatsHeaderProps> = ({
  atRiskCount,
  atRiskLabel,
  targetCurrent,
  targetMax,
  criticalCount
}) => {
  const percentage = Math.min(100, Math.round((targetCurrent / targetMax) * 100));

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {/* At Risk Card */}
      <Card className="p-5 border-default dark:border-border shadow-card rounded-lg overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-subtle uppercase tracking-wider">{atRiskLabel}</h3>
          <span className="inline-flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
        </div>
        <div className="bg-red-50 dark:bg-red-500/10 rounded-lg p-4 border border-red-100 dark:border-red-500/20">
          <div className="text-[11px] text-[hsl(var(--status-error-text))] font-medium mb-1">Total at Risk</div>
          <div className="text-2xl font-bold tracking-tight text-[hsl(var(--status-error-text))]">{atRiskCount} <span className="text-base font-medium">Calls</span></div>
        </div>
      </Card>

      {/* Target Card */}
      <Card className="p-5 border-default dark:border-border shadow-card rounded-lg overflow-hidden">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xs font-semibold text-subtle uppercase tracking-wider">Weekly Target</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Progress value={percentage} className="h-2 bg-[hsl(var(--border-subtle))] dark:bg-muted" />
            <span className="text-xs font-semibold text-body dark:text-muted-foreground min-w-[32px] text-right">{percentage}%</span>
          </div>
          <div className="flex justify-between items-end">
            <div className="text-2xl font-bold tracking-tight text-heading dark:text-foreground">
              {targetCurrent} <span className="text-subtle text-base font-normal">/ {targetMax}</span>
            </div>
            <Button variant="ghost" size="sm" className="text-brand hover:text-[hsl(var(--app-brand-hover))] hover:bg-brand-light dark:hover:bg-primary/10 h-auto px-2 py-1 text-xs font-medium">
              Edit
            </Button>
          </div>
        </div>
      </Card>

      {/* Critical Card */}
      <Card className="p-5 border-default dark:border-border shadow-card rounded-lg overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-subtle uppercase tracking-wider">Critical Failures</h3>
        </div>
        <p className="text-sm text-subtle dark:text-muted-foreground mb-3 leading-relaxed">
          You currently have <strong className="text-heading dark:text-foreground">{criticalCount}</strong> critical failed calls needing attention.
        </p>
        <div className="text-2xl font-bold tracking-tight text-heading dark:text-foreground">{criticalCount} <span className="text-base font-medium">Calls</span></div>
      </Card>
    </div>
  );
};

// --- Filter Tabs ---
interface FilterTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  counts: { open: number; completed: number; all: number };
}

export const FilterTabs: React.FC<FilterTabsProps> = ({ activeTab, onTabChange, counts }) => {
  const tabs = [
    { id: 'open', label: 'Open', count: counts.open },
    { id: 'completed', label: 'Completed', count: counts.completed },
    { id: 'all', label: 'All', count: counts.all },
  ];

  return (
    <div className="flex gap-1.5">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`
            px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors duration-150 flex items-center gap-1.5
            ${activeTab === tab.id
              ? 'bg-brand-light text-brand dark:bg-primary/10 dark:text-primary'
              : 'text-subtle hover:text-heading hover:bg-[hsl(var(--page-bg))] dark:hover:bg-muted dark:hover:text-foreground'
            }
          `}
        >
          {tab.label}
          <span className={`
            min-w-[20px] text-center px-1.5 py-0.5 rounded-full text-[11px] font-semibold
            ${activeTab === tab.id ? 'bg-[hsl(var(--app-brand-muted)/0.3)] text-brand dark:bg-primary/20 dark:text-primary' : 'bg-[hsl(var(--page-bg))] text-subtle dark:bg-muted dark:text-muted-foreground'}
          `}>
            {tab.count}
          </span>
        </button>
      ))}
    </div>
  );
};

// --- Search Bar ---
export const SearchBar: React.FC<{ value: string; onChange: (val: string) => void }> = ({ value, onChange }) => {
  return (
    <div className="relative w-full max-w-xs">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-subtle" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search calls..."
        className="pl-9 h-9 text-sm bg-elevated dark:bg-card border-default dark:border-border rounded-lg focus:border-[hsl(var(--app-brand))] focus:ring-1 focus:ring-[hsl(var(--app-brand)/0.2)]"
      />
    </div>
  );
};

