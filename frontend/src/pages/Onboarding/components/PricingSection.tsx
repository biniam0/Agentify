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
    <section className="bg-white py-20 md:py-28">
      <div ref={ref} className="mx-auto max-w-7xl px-6">
        <div
          className={`text-center transition-all duration-700 ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}
        >
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl md:text-5xl">
            Features
          </h2>
          <p className="mt-3 text-base text-gray-500 sm:text-lg">
            Choose the subscription plan that suits your needs
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan, index) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl border p-6 transition-all duration-500 sm:p-8 ${
                plan.highlighted
                  ? 'border-emerald-200 shadow-lg'
                  : 'border-gray-200'
              } ${
                isVisible
                  ? 'translate-y-0 opacity-100'
                  : 'translate-y-12 opacity-0'
              }`}
              style={{ transitionDelay: `${200 + index * 150}ms` }}
            >
              <div className="mb-6">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-gray-900 sm:text-xl">
                    {plan.name}
                  </h3>
                  {plan.badge && (
                    <Badge className="bg-red-100 text-red-600 hover:bg-red-100">
                      {plan.badge}
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-gray-500">{plan.deals}</p>
              </div>

              <div className="mb-6 flex items-center gap-3">
                <Switch
                  checked={annualBilling[index]}
                  onCheckedChange={(checked) =>
                    setAnnualBilling((prev) => ({ ...prev, [index]: checked }))
                  }
                />
                <span className="text-sm text-gray-600">Annual</span>
              </div>

              <Button
                onClick={onGetInvited}
                className={`mb-8 w-full ${
                  plan.highlighted
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                }`}
              >
                Get Invited
              </Button>

              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm">
                    <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
