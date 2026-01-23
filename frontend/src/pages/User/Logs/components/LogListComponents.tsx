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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* At Risk Card */}
      <Card className="p-6 border-subtle dark:border-border shadow-card">
        <h3 className="text-sm font-medium text-heading dark:text-foreground mb-4">{atRiskLabel}</h3>
        <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-4">
          <div className="text-xs text-[hsl(var(--status-error-text))] font-medium mb-1">Total at Risk</div>
          <div className="text-2xl font-bold text-[hsl(var(--status-error-text))]">{atRiskCount} Calls</div>
        </div>
      </Card>

      {/* Target Card */}
      <Card className="p-6 border-subtle dark:border-border shadow-card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-medium text-heading dark:text-foreground">Weekly Target</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Progress value={percentage} className="h-2 bg-[hsl(var(--border-subtle))] dark:bg-muted" />
            <span className="text-sm font-medium text-body dark:text-muted-foreground">{percentage}%</span>
          </div>
          <div className="flex justify-between items-end">
            <div className="text-2xl font-bold text-heading dark:text-foreground">
              {targetCurrent} <span className="text-subtle text-lg font-normal">/ {targetMax}</span>
            </div>
            <Button variant="ghost" size="sm" className="text-brand hover:text-[hsl(var(--app-brand-hover))] hover:bg-brand-light dark:hover:bg-primary/10 h-auto p-0 font-medium">
              Edit
            </Button>
          </div>
        </div>
      </Card>

      {/* Critical Card */}
      <Card className="p-6 border-subtle dark:border-border shadow-card">
        <h3 className="text-sm font-medium text-heading dark:text-foreground mb-2">Critical Failures</h3>
        <p className="text-sm text-subtle dark:text-muted-foreground mb-4">
          You currently have <strong className="text-heading dark:text-foreground">{criticalCount}</strong> critical failed calls needing attention.
        </p>
        <div className="text-2xl font-bold text-heading dark:text-foreground">{criticalCount} Calls</div>
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
    <div className="flex gap-2">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`
            px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2
            ${activeTab === tab.id 
              ? 'bg-brand-light text-brand dark:bg-primary/10 dark:text-primary' 
              : 'text-body dark:text-muted-foreground hover:bg-page dark:hover:bg-muted'
            }
          `}
        >
          {tab.label}
          <span className={`
            px-1.5 py-0.5 rounded-full text-xs
            ${activeTab === tab.id ? 'bg-[hsl(var(--app-brand-muted)/0.3)] text-brand dark:bg-primary/20 dark:text-primary' : 'bg-[hsl(var(--page-bg))] text-body dark:bg-muted dark:text-muted-foreground'}
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
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search"
        className="pl-9 bg-elevated dark:bg-card border-default dark:border-border"
      />
    </div>
  );
};

