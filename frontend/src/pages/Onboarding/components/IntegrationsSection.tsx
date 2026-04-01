import { useScrollAnimation } from '@/hooks/useScrollAnimation'

const orbitItems = [
  { name: 'Calendar', color: '#4285F4', icon: '31', ring: 1, angle: 30 },
  { name: 'Excel', color: '#217346', icon: 'X', ring: 1, angle: 90 },
  { name: 'HubSpot', color: '#FF7A59', icon: 'H', ring: 2, angle: 60 },
  { name: 'Gmail', color: '#EA4335', icon: 'M', ring: 2, angle: 120 },
  { name: 'Slack', color: '#4A154B', icon: '#', ring: 2, angle: 180 },
  { name: 'Google', color: '#34A853', icon: 'G', ring: 2, angle: 300 },
  { name: 'ChatGPT', color: '#10A37F', icon: 'AI', ring: 2, angle: 240 },
  { name: 'Salesforce', color: '#00A1E0', icon: 'SF', ring: 2, angle: 0 },
  { name: 'G2', color: '#FF492C', icon: 'G2', ring: 3, angle: 210 },
  { name: 'Jira', color: '#0052CC', icon: 'J', ring: 3, angle: 150 },
  { name: 'LinkedIn', color: '#0A66C2', icon: 'in', ring: 3, angle: 250 },
  { name: 'Attio', color: '#000', icon: 'A', ring: 3, angle: 330 },
  { name: 'Zapier', color: '#FF4A00', icon: 'Z', ring: 3, angle: 30 },
  { name: 'Notion', color: '#000', icon: 'N', ring: 3, angle: 290 },
  { name: 'Microsoft', color: '#F25022', icon: 'MS', ring: 3, angle: 70 },
  { name: 'Outlook', color: '#0078D4', icon: 'O', ring: 3, angle: 110 },
]

const ringRadii: Record<number, number> = { 1: 22, 2: 35, 3: 47 }

export function IntegrationsSection() {
  const { ref, isVisible } = useScrollAnimation(0.1)

  return (
    <section className="bg-white py-20 md:py-28">
      <div ref={ref} className="mx-auto max-w-7xl px-6 text-center">
        <div
          className={`transition-all duration-700 ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}
        >
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl md:text-5xl">
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
          className={`relative mx-auto mt-12 h-[360px] w-[360px] transition-all delay-200 duration-1000 sm:mt-16 sm:h-[480px] sm:w-[480px] md:h-[560px] md:w-[560px] ${
            isVisible ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
          }`}
        >
          {[1, 2, 3].map((ring) => (
            <div
              key={ring}
              className="absolute rounded-full border border-gray-200"
              style={{
                inset: `${(1 - ringRadii[ring] / 50) * 50}%`,
              }}
            />
          ))}

          <div className="absolute inset-[36%] rounded-full bg-gradient-to-b from-emerald-50 via-emerald-50/60 to-transparent" />

          <div className="absolute left-1/2 top-1/2 z-10 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl bg-white shadow-lg ring-1 ring-gray-100 sm:h-16 sm:w-16">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-600 sm:h-10 sm:w-10">
              <span className="text-base font-bold text-white sm:text-lg">X</span>
            </div>
          </div>

          {orbitItems.map((item) => {
            const radius = ringRadii[item.ring]
            const rad = (item.angle * Math.PI) / 180
            const x = 50 + radius * Math.cos(rad)
            const y = 50 + radius * Math.sin(rad)

            return (
              <div
                key={`${item.name}-${item.angle}`}
                className="absolute flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-md ring-1 ring-gray-100 transition-transform hover:scale-125 sm:h-10 sm:w-10"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <span
                  className="text-[10px] font-bold sm:text-xs"
                  style={{ color: item.color }}
                >
                  {item.icon}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
