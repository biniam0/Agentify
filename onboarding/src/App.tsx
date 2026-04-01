import { Navbar } from '@/components/sections/Navbar'
import { HeroSection } from '@/components/sections/HeroSection'
import { IntegrationsSection } from '@/components/sections/IntegrationsSection'
import { FeaturesSection } from '@/components/sections/FeaturesSection'
import { HowItWorksSection } from '@/components/sections/HowItWorksSection'
import { PricingSection } from '@/components/sections/PricingSection'
import { ContactFormSection } from '@/components/sections/ContactFormSection'
import { CtaBanner } from '@/components/sections/CtaBanner'
import { Footer } from '@/components/sections/Footer'

function App() {
  const scrollToContact = () => {
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen">
      <Navbar onCtaClick={scrollToContact} />
      <HeroSection onCtaClick={scrollToContact} />
      <IntegrationsSection />
      <FeaturesSection />
      <HowItWorksSection />
      <PricingSection onGetInvited={scrollToContact} />
      <ContactFormSection />
      <CtaBanner onCtaClick={scrollToContact} />
      <Footer />
    </div>
  )
}

export default App
