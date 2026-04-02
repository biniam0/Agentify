import { Zap, CheckSquare, GitBranch } from 'lucide-react'
import { useScrollAnimation } from '@/hooks/useScrollAnimation'

const features = [
  {
    icon: Zap,
    iconColor: 'text-blue-500',
    iconBg: 'bg-blue-50',
    decorBorder: 'border-blue-200',
    title: 'No more indecisive deals',
    bullets: [
      'AgentX captures notes, action items, and next steps and then updates HubSpot for you.',
      'Zero manual logging: tasks, contacts, and deals are created automatically.',
      'Reps stay in the conversation, not the CRM.',
      'Teams report shorter cycles and fewer follow-ups slipping through the cracks.',
    ],
  },
  {
    icon: CheckSquare,
    iconColor: 'text-emerald-500',
    iconBg: 'bg-emerald-50',
    decorBorder: 'border-emerald-200',
    title: 'RevOps as-a-Service',
    bullets: [
      'Smart pre-/post-meeting prompts: confirm EB, risks, and clear next steps.',
      'In-call capture of pains, stakeholders, and commitments—standardised every time.',
      'One consistent process across the team, boosting win consistency.',
    ],
  },
  {
    icon: GitBranch,
    iconColor: 'text-teal-500',
    iconBg: 'bg-teal-50',
    decorBorder: 'border-teal-200',
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
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl md:text-5xl">
            Fast, secure,{' '}
            <span className="text-[#00B596]">setup without a tech teams</span>

          </h2>
          <p className="mt-4 max-w-2xl text-base text-gray-500 sm:text-lg">
            AgentX starts working in minutes—automating admin, guiding reps, and
            keeping data compliant.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className={`group rounded-2xl border border-gray-200 bg-white p-6 transition-all duration-500 hover:shadow-lg sm:p-8 ${isVisible
                  ? 'translate-y-0 opacity-100'
                  : 'translate-y-12 opacity-0'
                }`}
              style={{ transitionDelay: `${200 + index * 150}ms` }}
            >
              <div className={`mb-6 flex h-36 items-center justify-center rounded-xl border ${feature.decorBorder} bg-gray-50/50 sm:h-40`}>
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${feature.iconBg} sm:h-16 sm:w-16`}>
                  <feature.icon className={`h-7 w-7 ${feature.iconColor} sm:h-8 sm:w-8`} />
                </div>
              </div>

              <h3 className="mb-4 text-lg font-bold text-gray-900 sm:text-xl">
                {feature.title}
              </h3>

              <ul className="space-y-3">
                {feature.bullets.map((bullet, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 text-sm text-gray-400"
                  >
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-gray-400" />
                    {bullet}
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
