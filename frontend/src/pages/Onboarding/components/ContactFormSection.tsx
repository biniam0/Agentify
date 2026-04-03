import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useScrollAnimation } from '@/hooks/useScrollAnimation'

export function ContactFormSection() {
  const { ref, isVisible } = useScrollAnimation(0.05)

  return (
    <section id="contact" className="ob-dark-bg py-20 md:py-28">
      <div ref={ref} className="mx-auto max-w-7xl px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div
            className={`space-y-6 transition-all duration-700 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
              }`}
          >
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
              Interested?
            </h2>
            <p className="text-lg font-medium text-gray-300">
              Reach out to us
            </p>
            <p className="max-w-md leading-relaxed text-gray-400">
              We only consider serious inquiries with complete and accurate
              information to ensure quality and relevance—especially a valid
              business email.
            </p>
            <p className="text-gray-400">
              Reach out to the founder if you would like to receive one of the
              following extra tools:
            </p>
          </div>

          <div
            className={`space-y-5 transition-all delay-200 duration-700 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
              }`}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-gray-300">
                  First name<span className="pl-1 text-green-400">*</span>
                </Label>
                <Input
                  placeholder="Jane"
                  className="h-10 border-gray-700 bg-gray-800/50 text-white placeholder:text-gray-500 focus-visible:ring-emerald-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">
                  Last name<span className="pl-1 text-green-400">*</span>
                </Label>
                <Input
                  placeholder="Smith"
                  className="h-10 border-gray-700 bg-gray-800/50 text-white placeholder:text-gray-500 focus-visible:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-gray-300">
                  Company name<span className="pl-1 text-green-400">*</span>
                </Label>
                <Input
                  placeholder="AgentX"
                  className="h-10 border-gray-700 bg-gray-800/50 text-white placeholder:text-gray-500 focus-visible:ring-emerald-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">
                  Email (only business email)<span className="pl-1 text-green-400">*</span>
                </Label>
                <Input
                  type="email"
                  placeholder="jane@agentx.com"
                  className="h-10 border-gray-700 bg-gray-800/50 text-white placeholder:text-gray-500 focus-visible:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-gray-300">
                  Role<span className="pl-1 text-green-400">*</span>
                </Label>
                <Select>
                  <SelectTrigger className="h-10 border-gray-700 bg-gray-800/50 text-white">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ceo">CEO / Founder</SelectItem>
                    <SelectItem value="cro">CRO / VP Sales</SelectItem>
                    <SelectItem value="revops">RevOps / Sales Ops</SelectItem>
                    <SelectItem value="ae">Account Executive</SelectItem>
                    <SelectItem value="sdr">SDR / BDR</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">
                  Industry<span className="pl-1 text-green-400">*</span>
                </Label>
                <Select>
                  <SelectTrigger className="h-10 border-gray-700 bg-gray-800/50 text-white">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="saas">SaaS</SelectItem>
                    <SelectItem value="fintech">FinTech</SelectItem>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                    <SelectItem value="ecommerce">E-Commerce</SelectItem>
                    <SelectItem value="consulting">Consulting</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-gray-300">
                  What is your revenue target?<span className="pl-1 text-green-400">*</span>
                </Label>
                <Select>
                  <SelectTrigger className="h-10 border-gray-700 bg-gray-800/50 text-white">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="100k">Under $100K</SelectItem>
                    <SelectItem value="500k">$100K - $500K</SelectItem>
                    <SelectItem value="1m">$500K - $1M</SelectItem>
                    <SelectItem value="5m">$1M - $5M</SelectItem>
                    <SelectItem value="10m">$5M - $10M</SelectItem>
                    <SelectItem value="10m+">$10M+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">
                  Number of sales?<span className="pl-1 text-green-400">*</span>
                </Label>
                <Select>
                  <SelectTrigger className="h-10 border-gray-700 bg-gray-800/50 text-white">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-5">1-5</SelectItem>
                    <SelectItem value="6-20">6-20</SelectItem>
                    <SelectItem value="21-50">21-50</SelectItem>
                    <SelectItem value="51-100">51-100</SelectItem>
                    <SelectItem value="100+">100+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">
                Are you the Economic Buyer<span className="pl-1 text-green-400">*</span>
              </Label>
              <Select>
                <SelectTrigger className="h-10 border-gray-700 bg-gray-800/50 text-white">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">
                Does your company operate in the Sales / GTM software industry?
                <span className="pl-1 text-green-400">*</span>
              </Label>
              <Select>
                <SelectTrigger className="h-10 border-gray-700 bg-gray-800/50 text-white">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              size="default"
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 py-4 text-base font-semibold text-white hover:from-emerald-600 hover:to-teal-600"
            >
              Submit
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
