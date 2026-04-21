import { Search, SlidersHorizontal, ChevronDown, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export type FilterOption = {
  value: string;
  label: string;
  count?: number;
};

export type FilterDef = {
  /** Unique id (also used as URL query param name). */
  id: string;
  /** Button label, e.g. "Status", "Stage". */
  label: string;
  /** Available options for this filter. */
  options: FilterOption[];
  /** Multi-select (default) or single-select. */
  multiple?: boolean;
  /** Icon to show alongside the label in the trigger. */
  icon?: React.ReactNode;
};

interface DealsSearchBarProps {
  /** Called whenever the search input value changes. */
  onSearch?: (query: string) => void;
  /** Initial value for the search input (useful when hydrating from the URL). */
  initialQuery?: string;
  /** Placeholder text for the search input. */
  searchPlaceholder?: string;

  // -------- Schema-driven filters (all optional) --------
  /**
   * When provided, renders a dropdown per entry instead of the legacy
   * hardcoded "Status"/"Workflow" buttons. Each entry drives its own menu.
   */
  filters?: FilterDef[];
  /** Current selection per filter id. Values must match `FilterOption.value`. */
  values?: Record<string, string[]>;
  /** Called when a filter's selection changes. */
  onFilterChange?: (id: string, values: string[]) => void;
  /** Called when the user clicks "Clear all" (only shown when something is active). */
  onClearAll?: () => void;
  /** If provided, renders an extra "More filters" button that invokes this callback. */
  onOpenMoreFilters?: () => void;
}

const DEFAULT_PLACEHOLDER = 'Search by company, deal name, or contract';

const DealsSearchBar = ({
  onSearch,
  initialQuery = '',
  searchPlaceholder = DEFAULT_PLACEHOLDER,
  filters,
  values,
  onFilterChange,
  onClearAll,
  onOpenMoreFilters,
}: DealsSearchBarProps) => {
  const [query, setQuery] = useState(initialQuery);

  const handleChange = (value: string) => {
    setQuery(value);
    onSearch?.(value);
  };

  const hasSchema = Array.isArray(filters) && filters.length > 0;
  const activeCount = hasSchema
    ? filters!.reduce((n, f) => n + ((values?.[f.id]?.length ?? 0) > 0 ? 1 : 0), 0)
    : 0;

  return (
    <div className="mb-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="relative w-full sm:flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 text-bold" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-gray-200 rounded-lg placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {hasSchema ? (
            <>
              {filters!.map((filter) => (
                <FilterDropdown
                  key={filter.id}
                  filter={filter}
                  selected={values?.[filter.id] ?? []}
                  onChange={(next) => onFilterChange?.(filter.id, next)}
                />
              ))}
              {onOpenMoreFilters && (
                <Button
                  variant="outline"
                  onClick={onOpenMoreFilters}
                  className="gap-1.5 px-3 py-2.5 h-auto text-sm text-gray-600 bg-white border-gray-200 rounded-lg hover:bg-gray-50 font-normal flex-shrink-0"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  More filters
                </Button>
              )}
              {activeCount > 0 && onClearAll && (
                <button
                  type="button"
                  onClick={onClearAll}
                  className="inline-flex items-center gap-1 text-xs font-medium text-subtle hover:text-heading transition-colors px-2 py-1"
                >
                  Clear all
                </button>
              )}
            </>
          ) : (
            <LegacyFilterButtons />
          )}
        </div>
      </div>

      {hasSchema && activeCount > 0 && (
        <ActiveFilterChips
          filters={filters!}
          values={values ?? {}}
          onRemove={(id, value) => {
            const current = values?.[id] ?? [];
            onFilterChange?.(
              id,
              current.filter((v) => v !== value)
            );
          }}
        />
      )}
    </div>
  );
};

// ─── Legacy no-op buttons (kept for sections that haven't adopted the schema yet) ───

const LegacyFilterButtons = () => (
  <>
    <Button
      variant="outline"
      className="gap-1.5 px-3 py-2.5 h-auto text-sm text-gray-600 bg-white border-gray-200 rounded-lg hover:bg-gray-50 font-normal flex-shrink-0"
    >
      Status
      <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
    </Button>
    <Button
      variant="outline"
      className="gap-1.5 px-3 py-2.5 h-auto text-sm text-gray-600 bg-white border-gray-200 rounded-lg hover:bg-gray-50 font-normal flex-shrink-0"
    >
      Workflow
      <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
    </Button>
    <Button
      variant="outline"
      className="gap-1.5 px-3 py-2.5 h-auto text-sm text-gray-600 bg-white border-gray-200 rounded-lg hover:bg-gray-50 font-normal flex-shrink-0"
    >
      <SlidersHorizontal className="h-3.5 w-3.5" />
      More filters
    </Button>
  </>
);

// ─── Schema-driven dropdown ──────────────────────────────────────────────────

interface FilterDropdownProps {
  filter: FilterDef;
  selected: string[];
  onChange: (next: string[]) => void;
}

const FilterDropdown = ({ filter, selected, onChange }: FilterDropdownProps) => {
  const multiple = filter.multiple !== false;
  const count = selected.length;
  const isActive = count > 0;

  const toggle = (value: string) => {
    if (multiple) {
      onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
    } else {
      onChange(selected[0] === value ? [] : [value]);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'gap-1.5 px-3 py-2.5 h-auto text-sm rounded-lg font-normal flex-shrink-0 transition-colors',
            isActive
              ? 'bg-brand-light text-brand border-brand/30 hover:bg-brand-light'
              : 'text-gray-600 bg-white border-gray-200 hover:bg-gray-50'
          )}
        >
          {filter.icon}
          {filter.label}
          {isActive && (
            <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-[11px] font-semibold text-white bg-brand rounded-full">
              {count}
            </span>
          )}
          <ChevronDown className={cn('h-3.5 w-3.5', isActive ? 'text-brand/70' : 'text-gray-400')} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[12rem] max-h-80 overflow-y-auto">
        <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-subtle font-semibold">
          {filter.label}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {multiple ? (
          filter.options.map((opt) => (
            <DropdownMenuCheckboxItem
              key={opt.value}
              checked={selected.includes(opt.value)}
              onCheckedChange={() => toggle(opt.value)}
              onSelect={(e) => e.preventDefault()}
            >
              <span className="flex-1 truncate">{opt.label}</span>
              {typeof opt.count === 'number' && (
                <span className="ml-3 text-xs text-subtle tabular-nums">{opt.count}</span>
              )}
            </DropdownMenuCheckboxItem>
          ))
        ) : (
          <DropdownMenuRadioGroup
            value={selected[0] ?? ''}
            onValueChange={(val) => onChange(val ? [val] : [])}
          >
            {filter.options.map((opt) => (
              <DropdownMenuRadioItem
                key={opt.value}
                value={opt.value}
                onSelect={(e) => e.preventDefault()}
              >
                <span className="flex-1 truncate">{opt.label}</span>
                {typeof opt.count === 'number' && (
                  <span className="ml-3 text-xs text-subtle tabular-nums">{opt.count}</span>
                )}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        )}
        {isActive && (
          <>
            <DropdownMenuSeparator />
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full text-left px-2 py-1.5 text-sm text-subtle hover:text-heading hover:bg-gray-50 rounded-sm transition-colors"
            >
              Clear
            </button>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// ─── Active-filter chips row ─────────────────────────────────────────────────

interface ActiveFilterChipsProps {
  filters: FilterDef[];
  values: Record<string, string[]>;
  onRemove: (id: string, value: string) => void;
}

const ActiveFilterChips = ({ filters, values, onRemove }: ActiveFilterChipsProps) => {
  const chips: Array<{ id: string; value: string; filterLabel: string; optionLabel: string }> = [];
  for (const f of filters) {
    const selected = values[f.id] ?? [];
    for (const v of selected) {
      const opt = f.options.find((o) => o.value === v);
      chips.push({
        id: f.id,
        value: v,
        filterLabel: f.label,
        optionLabel: opt?.label ?? v,
      });
    }
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap mt-3">
      {chips.map((chip) => (
        <span
          key={`${chip.id}:${chip.value}`}
          className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 text-xs font-medium text-heading bg-white border border-default rounded-full"
        >
          <span className="text-subtle">{chip.filterLabel}:</span>
          <span>{chip.optionLabel}</span>
          <button
            type="button"
            onClick={() => onRemove(chip.id, chip.value)}
            aria-label={`Remove filter ${chip.filterLabel}: ${chip.optionLabel}`}
            className="ml-0.5 p-0.5 rounded-full hover:bg-gray-100 text-subtle hover:text-heading transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
    </div>
  );
};

export default DealsSearchBar;
