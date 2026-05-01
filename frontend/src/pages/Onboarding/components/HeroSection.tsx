import { Button } from '@/components/ui/button'
import { useScrollAnimation } from '@/hooks/useScrollAnimation'
import { PhoneCarousel } from './PhoneCarousel'

interface HeroSectionProps {
  onCtaClick: () => void
}

export function HeroSection({ onCtaClick }: HeroSectionProps) {
  const { ref, isVisible } = useScrollAnimation(0.05)

  return (
    <section className="ob-dark-bg ob-grid-bg relative overflow-hidden pb-20 pt-16 md:pb-28 md:pt-24 min-h-[90vh] flex items-center">
      {/* Background Glows */}
      <div className="pointer-events-none absolute left-[-10%] top-1/4 h-[500px] w-[500px] rounded-full bg-[#00D287]/10 blur-[120px]" />
      <div className="pointer-events-none absolute right-1/4 top-1/2 h-[400px] w-[400px] rounded-full bg-[#00D287]/10 blur-[100px]" />

      <div ref={ref} className="mx-auto max-w-7xl px-6 relative z-10">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div
            className={`space-y-8 transition-all duration-700 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
              }`}
          >
            {/* Pill Badge */}
            <div className="relative inline-flex items-center gap-2.5 rounded-lg border-[1.5px] border-[#4A4A55] bg-[#2A2A30] px-4 py-1 text-[15px] font-medium text-white/90 shadow-lg">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <span className="relative z-10">AgentX does not require a tech team to work</span>
              <span className="relative z-10 text-base">🚀</span>
            </div>

            <h1 className="text-5xl font-bold leading-[1.1] tracking-tight text-white sm:text-6xl md:text-7xl lg:text-[5.5rem]">
              elite RevOps AI
              <br />
              for <span className="ob-green-accent">field sales</span>
            </h1>

            <p className="max-w-xl text-lg leading-relaxed text-gray-400 sm:text-xl">
              Turn every new sales rep into your best closer on Day 1-our Agent X
              not only tells them what to do –{' '}
              <strong className="text-white font-medium">as a top-tier RevOps</strong> – but
              also handles the CRM updates for them. Just connect, capture,{' '}
              <strong className="text-white font-medium">execute</strong>, and start selling.
            </p>

            <div className="relative inline-flex overflow-hidden rounded-md p-[1px]">
              <span className="absolute inset-[-1000%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,transparent_75%,#00E676_100%)]" />
              <Button
                onClick={onCtaClick}
                size="lg"
                className="relative rounded-[5px] border-0 bg-[#0A0A0A] px-8 py-6 text-base text-white hover:bg-white/5 overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                Start Today - For Free
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-8 pt-8 sm:gap-12 opacity-50 hover:opacity-100 transition-opacity duration-500">
              <img src="/logos/hubspot.svg" alt="HubSpot" className="h-6 w-auto sm:h-7" />
              <img src="/logos/salesforce-word.svg" alt="Salesforce" className="h-6 w-auto sm:h-7" />
              <img src="/logos/pipedrive.svg" alt="Pipedrive" className="h-6 w-auto sm:h-7" />
              <img src="/logos/attio.svg" alt="Attio" className="h-6 w-auto sm:h-7" />
            </div>
          </div>

          <div
            className={`flex justify-center transition-all delay-200 duration-700 lg:justify-end ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
              }`}
          >
            <PhoneCarousel />
          </div>
        </div>
      </div>
    </section>
  )
}
