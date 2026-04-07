import { useState, useRef, useEffect, useMemo } from 'react';
import {
  CountryIso2,
  defaultCountries,
  FlagImage,
  parseCountry,
  usePhoneInput,
} from 'react-international-phone';
import { Input } from '@/components/ui/input';
import { ChevronDown, Search } from 'lucide-react';

interface PhoneInputProps {
  value: string;
  onChange: (phone: string) => void;
  defaultCountry?: CountryIso2;
}

export function PhoneInput({ value, onChange, defaultCountry = 'us' }: PhoneInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const phoneInput = usePhoneInput({
    defaultCountry,
    value,
    onChange: ({ phone }) => onChange(phone),
    countries: defaultCountries,
  });

  const countries = useMemo(
    () =>
      defaultCountries.map((c) => {
        const parsed = parseCountry(c);
        return parsed;
      }),
    [],
  );

  const selectedCountry = useMemo(
    () => countries.find((c) => c.iso2 === phoneInput.country.iso2) || countries[0],
    [countries, phoneInput.country.iso2],
  );

  const filtered = useMemo(
    () =>
      search
        ? countries.filter(
            (c) =>
              c.name.toLowerCase().includes(search.toLowerCase()) ||
              c.dialCode.includes(search) ||
              c.iso2.includes(search.toLowerCase()),
          )
        : countries,
    [search, countries],
  );

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
    <div className="flex">
      {/* Country selector */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => { setOpen(!open); setSearch(''); }}
          className="flex items-center gap-1.5 h-11 pl-3 pr-2 rounded-l-md border border-r-0 border-default dark:border-border bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
        >
          <FlagImage iso2={selectedCountry.iso2} size="20px" />
          <span className="text-sm text-heading dark:text-foreground font-medium tabular-nums">
            +{selectedCountry.dialCode}
          </span>
          <ChevronDown className="h-3 w-3 text-gray-400" />
        </button>

        {open && (
          <div className="absolute z-50 top-full left-0 mt-1 w-[280px] rounded-md border border-default dark:border-border bg-white dark:bg-popover shadow-lg">
            {/* Search */}
            <div className="p-2 border-b border-default dark:border-border">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search countries..."
                  className="w-full h-8 pl-8 pr-3 text-sm rounded-md border border-default dark:border-border bg-transparent focus:outline-none focus:ring-1 focus:ring-[hsl(var(--app-brand))] placeholder:text-muted-foreground"
                />
              </div>
            </div>
            {/* Country list */}
            <div className="max-h-[220px] overflow-y-auto p-1">
              {filtered.map((c) => (
                <button
                  key={c.iso2}
                  type="button"
                  onClick={() => {
                    phoneInput.setCountry(c.iso2);
                    setOpen(false);
                    setSearch('');
                  }}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded text-sm transition-colors ${
                    c.iso2 === selectedCountry.iso2
                      ? 'bg-brand/10 text-brand'
                      : 'hover:bg-gray-100 dark:hover:bg-white/10 text-heading dark:text-foreground'
                  }`}
                >
                  <FlagImage iso2={c.iso2} size="18px" />
                  <span className="flex-1 text-left truncate">{c.name}</span>
                  <span className="text-xs text-gray-400 tabular-nums">+{c.dialCode}</span>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-3">No countries found</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Phone number input */}
      <Input
        ref={phoneInput.inputRef}
        value={phoneInput.inputValue}
        onChange={phoneInput.handlePhoneValueChange}
        placeholder="(555) 000-0000"
        type="tel"
        className="h-11 rounded-l-none border-default dark:border-border focus:border-[hsl(var(--app-brand))] focus:ring-[hsl(var(--app-brand))]/20 focus:z-10"
      />
    </div>
  );
}
