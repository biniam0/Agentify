import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import DealsSearchBar from './DealsSearchBar';
import DealsFilterTabs from './DealsFilterTabs';
import ClientsDealsTable from './ClientsDealsTable';
import * as dealService from '@/services/dealService';
import type { Deal } from '@/services/dealService';
import { useTenant } from '@/contexts/TenantContext';

interface ClientsDealsSectionProps {
  onViewDetails: (deal: Deal) => void;
}

const ClientsDealsSection = ({ onViewDetails }: ClientsDealsSectionProps) => {
  const { tenantSlug } = useTenant();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchDeals = useCallback(async () => {
    try {
      setLoading(true);
      const response = await dealService.getAdminDeals(tenantSlug || undefined);
      setDeals(response.deals || []);
    } catch (error: any) {
      console.error('Failed to fetch deals:', error);
      toast.error(error.response?.data?.message || 'Failed to load deals');
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  const filteredDeals = searchQuery
    ? deals.filter((deal) => {
        const q = searchQuery.toLowerCase();
        return (
          deal.dealName?.toLowerCase().includes(q) ||
          deal.company?.toLowerCase().includes(q) ||
          deal.owner?.name?.toLowerCase().includes(q) ||
          deal.owner?.email?.toLowerCase().includes(q) ||
          deal.tenantName?.toLowerCase().includes(q) ||
          deal.stage?.toLowerCase().includes(q)
        );
      })
    : deals;

  return (
    <div>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-heading">Clients Deals</h2>
          <p className="text-sm text-subtle">
            Manage deals and trigger info gathering calls.
          </p>
        </div>
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-light text-brand">
          {filteredDeals.length} deals
        </span>
      </div>

      <DealsSearchBar onSearch={setSearchQuery} />
      <DealsFilterTabs />

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-24 rounded-lg" />
                <Skeleton className="h-6 w-20 rounded-lg" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-8 w-28 rounded-lg" />
              </div>
            ))}
          </div>
        ) : filteredDeals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <Briefcase className="h-6 w-6 text-subtle" />
            </div>
            <p className="text-sm font-medium text-heading">No deals found</p>
            <p className="text-xs text-subtle mt-1">
              {searchQuery ? 'Try adjusting your search query' : 'Deals will appear here once synced'}
            </p>
          </div>
        ) : (
          <ClientsDealsTable deals={filteredDeals} onViewDetails={onViewDetails} />
        )}
      </div>

      {!loading && filteredDeals.length > 0 && (
        <div className="flex items-center justify-between px-1 py-4">
          <p className="text-xs text-subtle">
            Showing <span className="font-medium text-heading">{filteredDeals.length}</span> deals
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDeals}
            disabled={loading}
            className="h-8 px-3 text-xs rounded-lg border-default"
          >
            Refresh
          </Button>
        </div>
      )}
    </div>
  );
};

export default ClientsDealsSection;
