import { useState } from 'react'
import { useScrollAnimation } from '@/hooks/useScrollAnimation'

const steps = [
  {
    id: 'connect',
    title: 'Connect',
    description:
      'Connect your entire sales and marketing stack in minutes, no IT required. AgentX immediately unifies every interaction to build your single source of revenue truth.',
    integrations: [
      { name: 'HubSpot', color: '#FF7A59' },
      { name: 'Salesforce', color: '#00A1E0' },
      { name: 'Pipedrive', color: '#333' },
      { name: 'Attio', color: '#000' },
      { name: 'Gmail', color: '#EA4335' },
      { name: 'Slack', color: '#4A154B' },
      { name: 'MS Outlook', color: '#0078D4' },
      { name: 'LinkedIn', color: '#0A66C2' },
      { name: 'Zoom', color: '#2D8CFF' },
    ],
  },
  {
    id: 'clarify',
    title: 'Clarify',
    description:
      'AgentX automatically analyzes every deal, identifies hidden risks, and surfaces the insights your team needs to make confident decisions.',
    integrations: [],
  },
  {
    id: 'act',
    title: 'Act',
    description:
      'Get prescriptive next-best-actions, auto-created tasks, and real-time nudges that keep every deal moving forward.',
    integrations: [],
  },
]

export function HowItWorksSection() {
  const [activeStep, setActiveStep] = useState(0)
  const { ref, isVisible } = useScrollAnimation(0.08)

  return (
    <section className="ob-dark-bg py-20 md:py-28">
      <div ref={ref} className="mx-auto max-w-7xl px-6">
        <div
          className={`transition-all duration-700 ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}
        >
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            From Data Chaos to Revenue
            <br />
            Clarity
          </h2>
          <p className="mt-4 max-w-2xl text-base text-gray-400 sm:text-lg">
            Your revenue truth is buried in emails, calls, and CRM notes. AgentX
            automatically unifies this data, finds the hidden risks, and tells
            you exactly what to do next.
          </p>
        </div>

        <div
          className={`mt-14 flex flex-col gap-4 md:flex-row transition-all delay-300 duration-700 ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
          }`}
        >
          {steps.map((step, index) => {
            const isActive = activeStep === index

            return (
              <button
                key={step.id}
                onClick={() => setActiveStep(index)}
                className={`relative flex flex-col overflow-hidden rounded-2xl p-6 text-left transition-all duration-500 sm:p-8 ${
                  isActive
                    ? 'flex-[2] bg-gradient-to-br from-emerald-700 to-teal-800'
                    : 'flex-1 bg-gradient-to-br from-emerald-800/50 to-teal-900/50 hover:from-emerald-800/70 hover:to-teal-900/70'
                }`}
                style={{ minHeight: isActive ? '380px' : '200px' }}
              >
                {isActive && step.integrations.length > 0 && (
                  <div className="mb-6 flex-1 overflow-hidden rounded-xl bg-white/10 p-3 sm:p-4">
                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                      {step.integrations.map((item) => (
                        <div
                          key={item.name}
                          className="flex flex-col items-center gap-1 rounded-lg bg-white/90 p-1.5 sm:p-2"
                        >
                          <div
                            className="h-5 w-5 rounded sm:h-6 sm:w-6"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-[9px] text-gray-600 sm:text-[10px]">
                            {item.name}
                          </span>
                          <div className="flex items-center gap-1">
                            <div className="h-1 w-1 rounded-full bg-emerald-500 sm:h-1.5 sm:w-1.5" />
                            <span className="text-[7px] text-gray-400 sm:text-[8px]">
                              Manage
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-auto">
                  <h3 className="text-xl font-bold text-white sm:text-2xl">
                    {step.title}
                  </h3>
                  {isActive && (
                    <p className="mt-3 text-sm leading-relaxed text-white/80">
                      {step.description}
                    </p>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        <div className="mt-6 flex justify-center gap-2">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveStep(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                activeStep === i ? 'w-8 bg-emerald-500' : 'w-2 bg-gray-600 hover:bg-gray-500'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
