import { cn } from '@/lib/utils';

const TABS = [
  { id: 'overview', label: 'Overview' },
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
    <div className="flex bg-gray-50/50 p-0.5 border border-gray-200 rounded-xl mb-6">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            'flex-1 py-2 text-sm font-semibold rounded-lg transition-all',
            activeTab === tab.id
              ? 'bg-white text-gray-900 shadow-sm border border-gray-200/50'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default TopTabs;
