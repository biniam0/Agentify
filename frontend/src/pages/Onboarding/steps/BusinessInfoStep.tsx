import { useOnboarding } from '@/contexts/OnboardingContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowRight } from 'lucide-react';

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
        {/* Name + Email row */}
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
          <Input
            value={info.phone}
            onChange={(e) => setBusinessInfo({ phone: e.target.value })}
            placeholder="+1 (555) 000-0000"
            type="tel"
            className="h-11 border-default dark:border-border focus:border-[hsl(var(--app-brand))] focus:ring-[hsl(var(--app-brand))]/20"
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
      <div className="flex justify-end pt-4">
        <Button
          onClick={() => setCurrentStep(1)}
          disabled={!isComplete}
          className="bg-brand hover:bg-brand-hover text-white font-medium px-6 h-11 gap-2"
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
