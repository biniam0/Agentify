import { useScrollAnimation } from '@/hooks/useScrollAnimation'

const features = [
  {
    image: '/images/spark.png',
    title: 'No more indecisive deals',
    bullets: [
      'AgentX captures notes, action items, and next steps and then updates HubSpot for you.',
      'Zero manual logging: tasks, contacts, and deals are created automatically.',
      'Reps stay in the conversation, not the CRM.',
      'Teams report shorter cycles and fewer follow-ups slipping through the cracks.',
    ],
  },
  {
    image: '/images/checked.png',
    title: 'RevOps as-a-Service',
    bullets: [
      'Smart pre-/post-meeting prompts: confirm EB, risks, and clear next steps.',
      'In-call capture of pains, stakeholders, and commitments—standardised every time.',
      'One consistent process across the team, boosting win consistency.',
    ],
  },
  {
    image: '/images/infinity.png',
    title: 'Adaptive CRO Playbooks',
    bullets: [
      'AgentX flags risks and prescribes the next best action in real time.',
      'Auto-creates tasks, reminders, and Slack nudges when thresholds are hit.',
      'Weekly bottleneck summaries—no spreadsheets, no manual reporting.',
    ],
  },
]

export function FeaturesSection() {
  const { ref, isVisible } = useScrollAnimation(0.08)

  return (
    <section className="py-20 md:py-28">
      <div ref={ref} className="mx-auto max-w-7xl px-6">
        <div
          className={`transition-all duration-700 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`}
        >
          <h2 className="text-3xl font-medium tracking-tight text-gray-900 sm:text-4xl md:text-[44px] leading-tight">
            Fast, secure,{' '}
            <span className="text-[#1D8B71]">setup without a tech teams</span>
          </h2>
          <p className="mt-4 max-w-3xl text-base text-[#888888] sm:text-[17px]">
            AgentX starts working in minutes—automating admin, guiding reps, and
            keeping data compliant.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className={`group flex flex-col overflow-hidden rounded-lg bg-white shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all duration-500 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] ${isVisible
                ? 'translate-y-0 opacity-100'
                : 'translate-y-12 opacity-0'
                }`}
              style={{ transitionDelay: `${200 + index * 150}ms` }}
            >
              <div className="w-full">
                <img
                  src={feature.image}
                  alt={feature.title}
                  className="w-full h-auto object-cover"
                />
              </div>

              <div className="flex flex-1 flex-col p-6 sm:p-8">
                <h3 className="mb-5 text-lg font-medium text-gray-900 sm:text-[22px]">
                  {feature.title}
                </h3>

                <ul className="space-y-4">
                  {feature.bullets.map((bullet, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 text-[14px] text-[#888888] leading-relaxed"
                    >
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#888888]" />
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
