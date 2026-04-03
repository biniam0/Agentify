import { Button } from '@/components/ui/button'
import { useScrollAnimation } from '@/hooks/useScrollAnimation'

interface CtaBannerProps {
  onCtaClick: () => void
}

export function CtaBanner({ onCtaClick }: CtaBannerProps) {
  const { ref, isVisible } = useScrollAnimation(0.1)

  return (
    <section className="ob-dark-bg py-20 md:py-28">
      <div ref={ref} className="mx-auto max-w-7xl px-6">
        <div
          className={`relative overflow-hidden  p-8 transition-all duration-700 sm:p-12 md:p-16 lg:p-20 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`}
          style={{
            backgroundImage: "url('/images/cta-banner.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="space-y-8">
              <h2 className="text-4xl font-medium tracking-tight text-[#1A1A1A] sm:text-5xl md:text-[56px] leading-[1.1]">
                See Your Future
                <br />
                Revenue, Today.
              </h2>
              <Button
                onClick={onCtaClick}
                className="bg-[#53A17D] px-8 py-6 text-base font-medium text-white hover:bg-[#428565] rounded-xl"
              >
                Get Invited
              </Button>
            </div>

            <div className="rounded-[24px] bg-[#2C2C2C] p-10 pb-24">
              <h3 className="text-xl font-semibold text-[#9A9A9A] sm:text-2xl md:text-[26px] leading-snug">
                The era of reactive sales management is over.
              </h3>
              <p className="mt-4 text-sm text-[#9A9A9A] sm:text-[15px] leading-relaxed">
                AgentX Enterprise provides additional capabilities, security and
                control for your organization.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
