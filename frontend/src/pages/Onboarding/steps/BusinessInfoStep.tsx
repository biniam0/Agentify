import { useState } from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { PhoneInput } from '@/components/ui/phone-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowRight, Loader2 } from 'lucide-react';
import { saveOnboardingProfile } from '@/services/billingService';

const BUSINESS_TYPES = [
  'B2B SaaS',
  'Consulting',
  'E-commerce',
  'Manufacturing',
  'Financial Services',
  'Healthcare',
  'Real Estate',
  'Other',
];

const SOFTWARE_CATEGORIES = [
  'CRM',
  'ERP',
  'Marketing Automation',
  'Sales Enablement',
  'Customer Success',
  'Productivity',
  'Analytics',
  'Other',
];

const SALES_CYCLES = [
  '< 30 days',
  '30–60 days',
  '60–90 days',
  '3–6 months',
  '6–12 months',
  '> 12 months',
];

const DEAL_SIZES = [
  '< $1K',
  '$1K – $10K',
  '$10K – $25K',
  '$25K – $100K',
  '$100K – $500K',
  '> $500K',
];

export default function BusinessInfoStep() {
  const { state, setBusinessInfo, setCurrentStep, canProceedToStep } = useOnboarding();
  const info = state.businessInfo;
  const isComplete = canProceedToStep(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleContinue = async () => {
    setSaving(true);
    setError('');
    try {
      await saveOnboardingProfile({
        name: info.name,
        phone: info.phone,
        businessType: info.businessType,
        softwareCategory: info.softwareCategory,
        averageSalesCycle: info.averageSalesCycle,
        averageDealSize: info.averageDealSize,
      });
      setCurrentStep(1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save profile. Please try again.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-heading dark:text-foreground">
          Tell us about your business
        </h1>
        <p className="text-sm text-body dark:text-muted-foreground mt-2">
          This helps our AI understand your sales process and provide better insights
        </p>
      </div>

      <div className="space-y-5">
        {/* Name + Email */}
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-body dark:text-foreground font-medium text-sm">Full Name</Label>
            <Input
              value={info.name}
              onChange={(e) => setBusinessInfo({ name: e.target.value })}
              placeholder="John Doe"
              className="h-11 border-default dark:border-border focus:border-[hsl(var(--app-brand))] focus:ring-[hsl(var(--app-brand))]/20"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-body dark:text-foreground font-medium text-sm">Email</Label>
            <Input
              value={info.email}
              readOnly
              disabled
              className="h-11 border-default dark:border-border bg-gray-50 dark:bg-white/5"
            />
          </div>
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label className="text-body dark:text-foreground font-medium text-sm">Phone Number</Label>
          <PhoneInput
            value={info.phone}
            onChange={(phone) => setBusinessInfo({ phone })}
            defaultCountry="us"
          />
        </div>

        <div className="h-px bg-gray-100 dark:bg-white/10 my-2" />

        {/* Business Type + Software Category */}
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-body dark:text-foreground font-medium text-sm">Business Type</Label>
            <Select value={info.businessType} onValueChange={(v) => setBusinessInfo({ businessType: v })}>
              <SelectTrigger className="h-11 border-default dark:border-border">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {BUSINESS_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-body dark:text-foreground font-medium text-sm">Software Category</Label>
            <Select value={info.softwareCategory} onValueChange={(v) => setBusinessInfo({ softwareCategory: v })}>
              <SelectTrigger className="h-11 border-default dark:border-border">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {SOFTWARE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Sales Cycle + Deal Size */}
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-body dark:text-foreground font-medium text-sm">Average Sales Cycle</Label>
            <Select value={info.averageSalesCycle} onValueChange={(v) => setBusinessInfo({ averageSalesCycle: v })}>
              <SelectTrigger className="h-11 border-default dark:border-border">
                <SelectValue placeholder="Select cycle" />
              </SelectTrigger>
              <SelectContent>
                {SALES_CYCLES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-body dark:text-foreground font-medium text-sm">Average Deal Size (ACV)</Label>
            <Select value={info.averageDealSize} onValueChange={(v) => setBusinessInfo({ averageDealSize: v })}>
              <SelectTrigger className="h-11 border-default dark:border-border">
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent>
                {DEAL_SIZES.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Footer */}
      {error && (
        <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
      )}
      <div className="flex justify-end pt-4">
        <Button
          onClick={handleContinue}
          disabled={!isComplete || saving}
          className="bg-brand hover:bg-brand-hover text-white font-medium px-6 h-11 gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
