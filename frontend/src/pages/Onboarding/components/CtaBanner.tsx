import { Button } from '@/components/ui/button'
import { useScrollAnimation } from '@/hooks/useScrollAnimation'

interface CtaBannerProps {
  onCtaClick: () => void
}

export function CtaBanner({ onCtaClick }: CtaBannerProps) {
  const { ref, isVisible } = useScrollAnimation(0.1)

  return (
    <section className="bg-gray-100 py-20 md:py-28">
      <div ref={ref} className="mx-auto max-w-7xl px-6">
        <div
          className={`ob-marble-bg overflow-hidden rounded-3xl p-8 transition-all duration-700 sm:p-10 md:p-16 ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}
        >
          <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-10">
            <div className="space-y-6">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl md:text-5xl">
                See Your Future
                <br />
                Revenue, Today.
              </h2>
              <Button
                onClick={onCtaClick}
                className="bg-emerald-600 px-8 py-5 text-base text-white hover:bg-emerald-700"
              >
                Get Invited
              </Button>
            </div>

            <div className="rounded-2xl bg-gray-900 p-6 sm:p-8 md:p-10">
              <h3 className="text-xl font-bold text-white sm:text-2xl md:text-3xl">
                The era of reactive sales management is over.
              </h3>
              <p className="mt-4 text-sm text-gray-400 sm:text-base">
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
