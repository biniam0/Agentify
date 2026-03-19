import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { FilterTab } from '../data/types';

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: 'calls', label: 'All calls' },
  { id: 'info-gatherings', label: 'Info Gathering' },
  { id: 'meeting-scheduled', label: 'Meeting Scheduled' },
  { id: 'investigations', label: 'Investigations' },
  { id: 'high-risk', label: 'High Risk Only' },
];

const DealsFilterTabs = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = location.pathname.split('/v2/')[1] || 'calls';

  return (
    <div className="flex gap-0 border-b border-gray-200">
      {FILTER_TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => navigate(`/v2/${tab.id}`)}
          className={cn(
            'px-4 py-2.5 text-sm font-medium transition-colors relative whitespace-nowrap',
            activeTab === tab.id
              ? 'text-emerald-600'
              : 'text-gray-500 hover:text-gray-700'
          )}
        >
          {tab.label}
          {activeTab === tab.id && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-full" />
          )}
        </button>
      ))}
    </div>
  );
};

export default DealsFilterTabs;
