import { Navbar } from './components/Navbar'
import { HeroSection } from './components/HeroSection'
import { IntegrationsSection } from './components/IntegrationsSection'
import { FeaturesSection } from './components/FeaturesSection'
import { HowItWorksSection } from './components/HowItWorksSection'
import { ContactFormSection } from './components/ContactFormSection'
import { CtaBanner } from './components/CtaBanner'
import { Footer } from './components/Footer'

export default function OnboardingPage() {
  const scrollToContact = () => {
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen">
      <Navbar onCtaClick={scrollToContact} />
      <HeroSection onCtaClick={scrollToContact} />
      <IntegrationsSection />
      <FeaturesSection />
      <HowItWorksSection onGetInvited={scrollToContact} />
      <ContactFormSection />
      <CtaBanner onCtaClick={scrollToContact} />
      <Footer />
    </div>
  )
}
