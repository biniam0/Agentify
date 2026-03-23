import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { FilterTab } from '../data/types';

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: 'calls', label: 'All calls' },
  { id: 'info-gatherings', label: 'Info Gathering' },
  { id: 'clients-meetings', label: 'Clients Meetings' },
  { id: 'investigations', label: 'Investigations' },
  { id: 'clients-deals', label: 'Clients Deals' },
];

const DealsFilterTabs = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = location.pathname.split('/v2/')[1] || 'calls';

  return (
    <div className="flex gap-0 border-b border-default mb-6 relative">
      {FILTER_TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => navigate(`/v2/${tab.id}`)}
          className={cn(
            'px-4 py-2.5 text-sm font-medium transition-colors relative whitespace-nowrap',
            activeTab === tab.id
              ? 'text-brand'
              : 'text-subtle hover:text-heading'
          )}
        >
          {tab.label}
          {activeTab === tab.id && (
            <span className="absolute -bottom-[1px] left-0 right-0 h-0.5 bg-brand z-10" />
          )}
        </button>
      ))}
    </div>
  );
};

export default DealsFilterTabs;
