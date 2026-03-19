import { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';
import DealsSearchBar from './DealsSearchBar';
import DealsFilterTabs from './DealsFilterTabs';
import DealsTable from './DealsTable';
import { MOCK_DEALS } from '../data/mockDeals';
import type { V2Deal } from '../data/types';

interface ActiveDealsSectionProps {
  onViewDetails: (deal: V2Deal) => void;
}

const ActiveDealsSection = ({ onViewDetails }: ActiveDealsSectionProps) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDeals = useMemo(() => {
    if (!searchQuery) return MOCK_DEALS;
    const q = searchQuery.toLowerCase();
    return MOCK_DEALS.filter(
      (d) =>
        d.companyName.toLowerCase().includes(q) ||
        d.companySubtitle.toLowerCase().includes(q) ||
        d.status.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <div>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Active Deals</h2>
          <p className="text-sm text-gray-500">
            Manage and track your ongoing opportunities.
          </p>
        </div>
        <button className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 border border-emerald-600 hover:bg-emerald-50 px-3.5 py-2 rounded-lg transition-colors">
          <Plus className="h-4 w-4" />
          Add workflow
        </button>
      </div>

      <DealsSearchBar onSearch={setSearchQuery} />
      <DealsFilterTabs />

      <div className="bg-white rounded-b-xl border border-t-0 border-gray-200">
        <DealsTable deals={filteredDeals} onViewDetails={onViewDetails} />
      </div>
    </div>
  );
};

export default ActiveDealsSection;
