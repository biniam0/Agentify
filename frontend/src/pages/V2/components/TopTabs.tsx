import { cn } from '@/lib/utils';

const TABS = [
  { id: 'deals-overview', label: 'Deals overview' },
  { id: 'active-calls', label: 'Active calls' },
  { id: 'automations', label: 'Automations' },
] as const;

export type TopTabId = (typeof TABS)[number]['id'];

interface TopTabsProps {
  activeTab: TopTabId;
  onTabChange: (tab: TopTabId) => void;
}

const TopTabs = ({ activeTab, onTabChange }: TopTabsProps) => {
  return (
    <div className="inline-flex border border-gray-200 rounded-lg overflow-hidden mb-6 bg-white">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            'px-8 py-3 text-sm font-medium transition-colors border-r border-gray-200 last:border-r-0',
            activeTab === tab.id
              ? 'bg-gray-900 text-white'
              : 'bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default TopTabs;
