import { useEffect, useMemo, useRef, useState } from 'react';

import { defaultCountries, FlagImage, parseCountry } from 'react-international-phone';
import { ChevronDown, Search } from 'lucide-react';

import { cn } from '@/lib/utils';

interface CountrySelectProps {
  // ISO 3166-1 alpha-2 country code (e.g., "us", "in"). Case-insensitive on input; output is lowercase.
  value?: string;
  onChange: (iso2: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function CountrySelect({
  value,
  onChange,
  placeholder = 'Select country',
  disabled,
  id,
  className,
}: CountrySelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const countries = useMemo(() => defaultCountries.map((c) => parseCountry(c)), []);

  const normalizedValue = value?.toLowerCase() ?? '';

  const selectedCountry = useMemo(
    () => countries.find((c) => c.iso2 === normalizedValue),
    [countries, normalizedValue],
  );

  const filtered = useMemo(() => {
    if (!search) return countries;
    const q = search.toLowerCase();
    return countries.filter(
      (c) => c.name.toLowerCase().includes(q) || c.iso2.includes(q) || c.dialCode.includes(search),
    );
  }, [countries, search]);

  useEffect(() => {
    if (open && searchRef.current) searchRef.current.focus();
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={cn('relative w-full', className)} ref={dropdownRef}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((prev) => !prev);
          setSearch('');
        }}
        className={cn(
          'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm',
          'focus:outline-none focus:ring-1 focus:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
      >
        <span className="flex items-center gap-2 truncate">
          {selectedCountry ? (
            <>
              <FlagImage iso2={selectedCountry.iso2} size="18px" />
              <span className="truncate">{selectedCountry.name}</span>
            </>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="bg-popover absolute z-50 mt-1 w-full overflow-hidden rounded-md border shadow-lg">
          <div className="border-b p-2">
            <div className="relative">
              <Search className="text-muted-foreground absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search countries..."
                className="placeholder:text-muted-foreground h-8 w-full rounded-md border bg-transparent pl-8 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          <div className="max-h-[240px] overflow-y-auto p-1">
            {filtered.map((c) => {
              const isSelected = c.iso2 === selectedCountry?.iso2;
              return (
                <button
                  key={c.iso2}
                  type="button"
                  onClick={() => {
                    onChange(c.iso2);
                    setOpen(false);
                    setSearch('');
                  }}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-sm transition-colors',
                    isSelected
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                      : 'hover:bg-muted',
                  )}
                >
                  <FlagImage iso2={c.iso2} size="18px" />
                  <span className="flex-1 truncate text-left">{c.name}</span>
                  <span className="text-muted-foreground text-xs tabular-nums">+{c.dialCode}</span>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-muted-foreground py-3 text-center text-sm">No countries found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
