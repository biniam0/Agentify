import { useScrollAnimation } from '@/hooks/useScrollAnimation'
import { GeometricX } from './phone-slides/GeometricX'

const innerRingItems = [
  { name: 'LinkedIn', icon: '/logos/linkedin.svg', angle: 0 },
  { name: 'OpenAI', icon: '/logos/openai.svg', angle: 51 },
  { name: 'Gmail', icon: '/logos/gmail.svg', angle: 103 },
  { name: 'HubSpot', icon: '/logos/hubspot-icon.svg', angle: 154 },
  { name: 'Perplexity', icon: '/logos/perplexity.svg', angle: 206 },
  { name: 'DeepSeek', icon: '/logos/deepseek.svg', angle: 257 },
  { name: 'Bolt', icon: '/logos/bolt.svg', angle: 309 },
]

const outerRingItems = [
  { name: 'Google Calendar', icon: '/logos/google-calendar.svg', angle: 0 },
  { name: 'Notion', icon: '/logos/notion.svg', angle: 40 },
  { name: 'Microsoft', icon: '/logos/microsoft.svg', angle: 80 },
  { name: 'n8n', icon: '/logos/n8n.svg', angle: 120 },
  { name: 'Salesforce', icon: '/logos/salesforce.svg', angle: 160 },
  { name: 'Google', icon: '/logos/google.svg', angle: 200 },
  { name: 'Excel', icon: '/logos/excel.svg', angle: 240 },
  { name: 'G2', icon: '/logos/g2.svg', angle: 280 },
  { name: 'Slack', icon: '/logos/slack.svg', angle: 320 },
]

export function IntegrationsSection() {
  const { ref, isVisible } = useScrollAnimation(0.1)

  return (
    <section className="bg-white py-20 md:py-20 overflow-hidden">
      <div ref={ref} className="mx-auto max-w-7xl px-6 text-center">
        <div
          className={`transition-all duration-700 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`}
        >
          <h2 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl md:text-5xl">
            Connect Everything.
            <br />
            See Everything.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-gray-500 sm:text-lg">
            The truth of your pipeline is scattered across a dozen tools. AgentX
            unifies your entire GTM stack, breaking down data silos to create a
            single, undisputed view of every deal.
          </p>
        </div>

        <div
          className={`relative mx-auto mt-12 flex aspect-square w-full max-w-[400px] items-center justify-center transition-all delay-200 duration-1000 sm:mt-16 sm:max-w-[520px] md:max-w-[620px] ${isVisible ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
            }`}
        >
          {/* Outer Ring */}
          <div
            className="absolute flex h-full w-full items-center justify-center rounded-full border border-black/[0.06] animate-spin-slow"
          >
            {outerRingItems.map((item) => {
              const rad = (item.angle * Math.PI) / 180
              const x = 50 * Math.cos(rad)
              const y = 50 * Math.sin(rad)

              return (
                <div
                  key={item.name}
                  className="absolute"
                  style={{
                    left: `calc(50% + ${x}%)`,
                    top: `calc(50% + ${y}%)`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white animate-spin-slow-reverse sm:h-14 sm:w-14"
                    style={{
                      boxShadow: 'rgba(0, 0, 0, 0.1) 0px 1px 3px 0px, rgba(0, 0, 0, 0.09) 0px 6px 6px 0px, rgba(0, 0, 0, 0.05) 0px 13px 8px 0px, rgba(0, 0, 0, 0.01) 0px 22px 9px 0px, rgba(0, 0, 0, 0) 0px 35px 10px 0px',
                    }}
                  >
                    <img src={item.icon} alt={item.name} className="h-6 w-6 object-contain sm:h-7 sm:w-7" />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Middle Ring (static, between outer and inner) */}
          <div
            className="absolute h-[80%] w-[80%] rounded-full"
            style={{
              boxShadow: 'inset 0 2px 12px rgba(0, 0, 0, 0.06), inset 0 0 4px rgba(0, 0, 0, 0.03)',
              // background: 'rgba(0, 0, 0, 0.005)'
            }}
          />

          {/* Inner Ring */}
          <div
            className="absolute flex h-[63%] w-[63%] items-center justify-center rounded-full border border-black/[0.06] animate-spin-slow-reverse"
          >
            {innerRingItems.map((item) => {
              const rad = (item.angle * Math.PI) / 180
              const x = 50 * Math.cos(rad)
              const y = 50 * Math.sin(rad)

              return (
                <div
                  key={item.name}
                  className="absolute"
                  style={{
                    left: `calc(50% + ${x}%)`,
                    top: `calc(50% + ${y}%)`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white animate-spin-slow sm:h-14 sm:w-14"
                    style={{
                      boxShadow: 'rgba(0, 0, 0, 0.1) 0px 1px 3px 0px, rgba(0, 0, 0, 0.09) 0px 6px 6px 0px, rgba(0, 0, 0, 0.05) 0px 13px 8px 0px, rgba(0, 0, 0, 0.01) 0px 22px 9px 0px, rgba(0, 0, 0, 0) 0px 35px 10px 0px',
                    }}
                  >
                    <img src={item.icon} alt={item.name} className="h-6 w-6 object-contain sm:h-7 sm:w-7" />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Center Glow - large radial gradient */}
          <div
            className="absolute h-[55%] w-[55%] rounded-full"
            style={{
              background: 'radial-gradient(50% 50% at 50% 50%, rgba(20, 184, 166, 0.15) 0%, rgba(20, 184, 166, 0.08) 40%, rgba(20, 184, 166, 0.03) 70%, rgba(20, 184, 166, 0) 100%)',
            }}
          />

          {/* Outermost center ring (with inner shadow) */}
          <div
            className="absolute h-[48%] w-[48%] rounded-full border border-black/[0.05]"
            style={{
              boxShadow: 'inset 0 2px 12px rgba(0, 0, 0, 0.04), inset 0 0 4px rgba(0, 0, 0, 0.02)',
              background: 'rgba(255, 255, 255, 0.1)',
            }}
          />

          {/* Middle center ring (with inner shadow) */}
          <div
            className="absolute h-[35%] w-[35%] rounded-full border border-black/[0.05]"
            style={{
              boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.05), inset 0 0 4px rgba(0, 0, 0, 0.02)',
              background: 'rgba(255, 255, 255, 0.15)',
            }}
          />

          {/* Inner center ring (with inner shadow) */}
          <div
            className="absolute h-[22%] w-[22%] rounded-full border border-black/[0.05]"
            style={{
              boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.06), inset 0 0 3px rgba(0, 0, 0, 0.03)',
              background: 'rgba(255, 255, 255, 0.2)',
            }}
          />

          {/* Center Logo with radial glow */}
          <div
            className="absolute z-10 flex h-[74px] w-[74px] items-center justify-center rounded-[23px] bg-white/60 backdrop-blur-md sm:h-[105px] sm:w-[105px] sm:rounded-[31px]"
            style={{
              boxShadow: 'rgba(0, 0, 0, 0.06) 0px 2px 4px 0px, rgba(0, 0, 0, 0.04) 0px 8px 8px 0px',
            }}
          >
            {/* 6 radial gradient glow elements around this box */}
            {[0, 60, 120, 180, 240, 300].map((angle) => {
              const rad = (angle * Math.PI) / 180
              const offset = 52
              const x = offset * Math.cos(rad)
              const y = offset * Math.sin(rad)
              return (
                <div
                  key={angle}
                  className="absolute h-[170px] w-[170px] -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `calc(50% + ${x}px)`,
                    top: `calc(50% + ${y}px)`,
                    // Increased intensity: rgba(82, 183, 136, 0.6)
                    background: 'radial-gradient(50% 50% at 50% 50%, rgba(82, 183, 136, 0.3 ) 0%, rgba(227, 148, 0, 0) 100%)',
                  }}
                />

              )
            })}

            <div className="relative z-10 flex h-[68px] w-[68px] items-center justify-center rounded-[20px] border border-neutral-200 bg-white sm:h-[95px] sm:w-[95px] sm:rounded-[26px]">
              <GeometricX className="h-7 w-auto sm:h-10" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
