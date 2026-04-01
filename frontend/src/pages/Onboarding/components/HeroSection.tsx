import { Button } from '@/components/ui/button'
import { Phone, MessageSquare, Bell } from 'lucide-react'
import { useScrollAnimation } from '@/hooks/useScrollAnimation'

interface HeroSectionProps {
  onCtaClick: () => void
}

export function HeroSection({ onCtaClick }: HeroSectionProps) {
  const { ref, isVisible } = useScrollAnimation(0.05)

  return (
    <section className="ob-dark-bg relative overflow-hidden pb-20 pt-16 md:pb-28 md:pt-24">
      <div ref={ref} className="mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div
            className={`space-y-8 transition-all duration-700 ${
              isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`}
          >
            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
              elite RevOps AI
              <br />
              for <span className="ob-green-accent">field sales</span>
            </h1>

            <p className="max-w-lg text-base leading-relaxed text-gray-400 sm:text-lg">
              Turn every new sales rep into your best closer on Day 1—our Agent X
              not only tells them what to do –{' '}
              <strong className="text-white">as a top-tier RevOps</strong> – but
              also handles the CRM updates for them. Just connect, capture,{' '}
              <strong className="text-white">execute</strong>, and start selling.
            </p>

            <Button
              onClick={onCtaClick}
              size="lg"
              className="rounded-lg border border-white/20 bg-transparent px-8 py-6 text-base text-white hover:bg-white/10"
            >
              Start Today - For Free
            </Button>

            <div className="flex flex-wrap items-center gap-6 pt-4 sm:gap-8">
              <span className="text-lg font-bold text-white sm:text-xl">
                HubSp<span className="text-emerald-500">o</span>t
              </span>
              <span className="rounded bg-blue-600 px-2 py-0.5 text-xs font-bold text-white sm:text-sm">
                salesforce
              </span>
              <span className="text-lg font-bold text-white sm:text-xl">
                pipedrive
              </span>
              <span className="flex items-center gap-1 text-lg font-bold text-white sm:text-xl">
                <svg viewBox="0 0 20 20" className="h-4 w-4 fill-current sm:h-5 sm:w-5">
                  <path d="M10 2L2 6l8 4 8-4-8-4zM2 14l8 4 8-4M2 10l8 4 8-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
                </svg>
                attio
              </span>
            </div>
          </div>

          <div
            className={`flex justify-center transition-all delay-200 duration-700 lg:justify-end ${
              isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
            }`}
          >
            <div className="relative">
              <div className="relative h-[520px] w-[260px] overflow-hidden rounded-[36px] border-[3px] border-gray-700 bg-gradient-to-br from-gray-500/20 to-gray-800/40 shadow-2xl sm:h-[580px] sm:w-[290px] sm:rounded-[40px] sm:border-4">
                <div className="absolute left-1/2 top-0 z-10 h-6 w-28 -translate-x-1/2 rounded-b-2xl bg-gray-800" />

                <div className="relative z-10 flex items-center justify-between px-6 pt-3">
                  <span className="text-xs font-medium text-white">9:41</span>
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-3 rounded-sm border border-white/60" />
                  </div>
                </div>

                <div className="flex flex-col items-center pt-14 sm:pt-16">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 shadow-lg shadow-emerald-600/30">
                    <span className="text-lg font-bold text-white">X</span>
                  </div>
                  <h3 className="text-xl font-semibold text-white">Agent X</h3>
                  <p className="text-sm text-gray-400">connecting...</p>
                </div>

                <div className="absolute bottom-14 left-0 right-0 px-10 sm:bottom-16 sm:px-12">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 sm:h-12 sm:w-12">
                        <Bell className="h-5 w-5 text-white" />
                      </div>
                      <span className="text-[10px] text-gray-400 sm:text-xs">Remind Me</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 sm:h-12 sm:w-12">
                        <MessageSquare className="h-5 w-5 text-white" />
                      </div>
                      <span className="text-[10px] text-gray-400 sm:text-xs">Message</span>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-6 sm:mt-8">
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 shadow-lg shadow-red-500/30 sm:h-16 sm:w-16">
                        <Phone className="h-5 w-5 rotate-[135deg] text-white sm:h-6 sm:w-6" />
                      </div>
                      <span className="text-[10px] text-gray-400 sm:text-xs">Decline</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/30 sm:h-16 sm:w-16">
                        <Phone className="h-5 w-5 text-white sm:h-6 sm:w-6" />
                      </div>
                      <span className="text-[10px] text-gray-400 sm:text-xs">Accept</span>
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-2 left-1/2 h-1 w-28 -translate-x-1/2 rounded-full bg-white/30 sm:w-32" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
