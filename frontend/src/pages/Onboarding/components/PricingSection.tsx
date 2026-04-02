import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Check } from 'lucide-react'
import { useScrollAnimation } from '@/hooks/useScrollAnimation'

interface PricingSectionProps {
  onGetInvited: () => void
}

const plans = [
  {
    name: 'Pro Plan',
    deals: '5 Deals monitoring',
    highlighted: false,
    features: [
      '1 Seats included',
      '90 Risk Indicators',
      '5 Recommendations per deal',
      '9 Barrier Categories',
    ],
  },
  {
    name: 'Business Plan',
    deals: '30 Deals monitoring',
    highlighted: true,
    badge: 'Best value',
    features: [
      '3 Seats included',
      '150 Risk Indicators',
      '25 Recommendations per deal',
      '13 Barrier Categories',
      'Public API & Webhooks',
    ],
  },
  {
    name: 'Enterprise Plan',
    deals: 'Unlimited Deals monitoring',
    highlighted: false,
    features: [
      'Unlimited Seats included',
      '500+ Risk Indicators',
      'Unlimited Recommendations',
      '18 Barrier Categories',
      'SSO, API & Webhooks',
      'Enterprise Governance',
    ],
  },
]

export function PricingSection({ onGetInvited }: PricingSectionProps) {
  const [annualBilling, setAnnualBilling] = useState<Record<number, boolean>>({
    0: false,
    1: false,
    2: false,
  })
  const { ref, isVisible } = useScrollAnimation(0.08)

  return (
    <div className="mt-20 md:mt-32 w-full">
      <div ref={ref} className="mx-auto max-w-5xl">
        <div
          className={`text-center transition-all duration-700 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`}
        >
          <h2 className="text-6xl font-medium tracking-tight text-gray-900 sm:text-[50px] md:text-[60px]">
            Features
          </h2>

          <p className="mt-4 text-sm text-gray-500 sm:text-base">
            Choose the subscription plan that suits your needs
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan, index) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-3xl border border-gray-100 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-6 transition-all duration-500 sm:p-8 ${isVisible
                ? 'translate-y-0 opacity-100'
                : 'translate-y-12 opacity-0'
                }`}
              style={{ transitionDelay: `${200 + index * 150}ms` }}
            >
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-medium text-gray-900">
                    {plan.name}
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">{plan.deals}</p>
                </div>
                {plan.badge && (
                  <span className="rounded-full bg-[#E2F5ED] px-3 py-1 text-xs font-medium text-[#1D8B71]">
                    {plan.badge}
                  </span>
                )}
              </div>

              <div className="mb-6 flex items-center gap-3">
                <Switch
                  checked={annualBilling[index]}
                  onCheckedChange={(checked) =>
                    setAnnualBilling((prev) => ({ ...prev, [index]: checked }))
                  }
                  className="data-[state=checked]:bg-[#1D8B71]"
                />
                <span className="text-sm text-gray-500">Annual</span>
              </div>

              <div className="mb-6 h-[1px] w-full bg-gray-200" />

              <Button
                onClick={onGetInvited}
                className={`mb-8 w-full rounded-xl py-6 text-base font-medium ${plan.highlighted
                  ? 'bg-[#1D8B71] text-white hover:bg-[#166F5A]'
                  : 'bg-[#E2F5ED] text-[#1D8B71] hover:bg-[#D0EBE0]'
                  }`}
              >
                Get Invited
              </Button>

              <ul className="space-y-4">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm">
                    <Check className="h-4 w-4 shrink-0 text-[#53A17D]" strokeWidth={2.5} />
                    <span className="text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
