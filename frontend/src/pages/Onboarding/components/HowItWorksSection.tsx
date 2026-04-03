import { useState, useEffect } from 'react'
import { useScrollAnimation } from '@/hooks/useScrollAnimation'
import { PricingSection } from './PricingSection'

interface HowItWorksSectionProps {
  onGetInvited: () => void
}

const steps = [
  {
    id: 'connect',
    title: 'Connect',
    description:
      'Connect your entire sales and marketing stack in minutes, no IT required. AgentX immediately unifies every interaction to build your single source of revenue truth.',
    image: '/images/connect.png',
  },
  {
    id: 'clarify',
    title: 'Clarify',
    description:
      'Our engine analyzes thousands of signals to surface the risks that kill forecasts. Get a clear, plain-language diagnosis for every deal, turning pipeline ambiguity into absolute clarity.',
    image: '/images/clarify.png',
  },
  {
    id: 'act',
    title: 'Act',
    description:
      'Don\'t just diagnose risk—eliminate it. For every issue, AgentX provides the precise, next-best-action that you can execute in a single click, ensuring every deal moves forward.',
    image: '/images/act.png',
  },
]

export function HowItWorksSection({ onGetInvited }: HowItWorksSectionProps) {
  const [activeStep, setActiveStep] = useState(0)
  const { ref, isVisible } = useScrollAnimation(0.08)

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length)
    }, 5000)

    return () => clearInterval(timer)
  }, [activeStep])

  return (
    <section className="ob-dark-bg py-20 md:py-28">
      <div ref={ref} className="mx-auto max-w-7xl px-6">
        <div
          className={`rounded-3xl bg-white p-8 sm:p-12 md:p-16 transition-all duration-700 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`}
        >
          <div className="max-w-2xl">
            <h2 className="text-3xl font-medium tracking-tight text-gray-900 sm:text-4xl md:text-5xl">
              From Data Chaos to Revenue Clarity
            </h2>
            <p className="mt-4 text-base text-gray-500 sm:text-lg">
              Your revenue truth is buried in emails, calls, and CRM notes. AgentX
              automatically unifies this data, finds the hidden risks, and tells
              you exactly what to do next.
            </p>
          </div>

          <div className="mt-12 flex h-[480px] flex-col gap-4 md:flex-row">
            {steps.map((step, index) => {
              const isActive = activeStep === index

              return (
                <button
                  key={step.id}
                  onClick={() => setActiveStep(index)}
                  onMouseEnter={() => setActiveStep(index)}
                  className={`relative flex overflow-hidden rounded-3xl text-left transition-all duration-500 ${isActive
                    ? 'flex-[8] bg-[#4A8B6A] p-8 sm:p-10 md:p-12'
                    : 'flex-1 bg-[#85BCA0] p-6 hover:bg-[#72B090]'
                    }`}
                >
                  {isActive ? (
                    <div className="flex items-center h-full w-full flex-col md:flex-row md:gap-12 lg:gap-20">
                      {/* Left Side: Text and Dots */}
                      <div className="flex h-full w-full flex-col justify-between md:w-[45%] pr-3">
                        <div className="flex flex-1 flex-col justify-center pt-24">
                          <h3 className="text-3xl font-semibold text-white sm:text-4xl md:text-[40px]">
                            {step.title}
                          </h3>
                          <p className="mt-6 text-sm leading-relaxed text-white sm:text-[17px]">
                            {step.description}
                          </p>
                        </div>

                        {/* Dots */}
                        <div className="mt-8 flex gap-2">
                          <style>{`
                            @keyframes fillBar {
                              from { width: 0%; }
                              to { width: 100%; }
                            }
                          `}</style>
                          {steps.map((_, i) => (
                            <div
                              key={i}
                              className={`relative h-1.5 overflow-hidden rounded-full transition-all duration-300 ${
                                activeStep === i ? 'w-8 bg-white/40' : 'w-4 bg-white/40'
                              }`}
                            >
                              {activeStep === i && (
                                <div
                                  className="absolute left-0 top-0 h-full bg-white"
                                  style={{ animation: 'fillBar 5s linear forwards' }}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Right Side: Image */}
                      <div className="absolute right-0 top-1/2 hidden w-[55%] -translate-y-1/2 pr-8 md:block lg:pr-12">
                        <img
                          src={step.image}
                          alt={step.title}
                          className="h-auto w-full object-contain drop-shadow-2xl"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <h3 className="text-xl font-medium text-white sm:text-2xl md:-rotate-90 md:whitespace-nowrap">
                        {step.title}
                      </h3>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
          
          {/* Embedded Pricing Section */}
          <PricingSection onGetInvited={onGetInvited} />
        </div>
      </div>
    </section>
  )
}
