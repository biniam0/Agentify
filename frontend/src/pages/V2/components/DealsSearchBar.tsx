import { Search, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface DealsSearchBarProps {
  onSearch?: (query: string) => void;
}

const DealsSearchBar = ({ onSearch }: DealsSearchBarProps) => {
  const [query, setQuery] = useState('');

  const handleChange = (value: string) => {
    setQuery(value);
    onSearch?.(value);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
      <div className="relative w-full sm:flex-1 sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 text-bold" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Search by company, deal name, or contract"
          className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-gray-200 rounded-lg placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
        />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" className="gap-1.5 px-3 py-2.5 h-auto text-sm text-gray-600 bg-white border-gray-200 rounded-lg hover:bg-gray-50 font-normal flex-shrink-0">
          Status
          <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
        </Button>
        <Button variant="outline" className="gap-1.5 px-3 py-2.5 h-auto text-sm text-gray-600 bg-white border-gray-200 rounded-lg hover:bg-gray-50 font-normal flex-shrink-0">
          Workflow
          <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
        </Button>
        <Button variant="outline" className="gap-1.5 px-3 py-2.5 h-auto text-sm text-gray-600 bg-white border-gray-200 rounded-lg hover:bg-gray-50 font-normal flex-shrink-0">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          More filters
        </Button>
      </div>
    </div>
  );
};

export default DealsSearchBar;
