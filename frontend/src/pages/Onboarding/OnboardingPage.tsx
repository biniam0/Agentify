import { useNavigate } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { HeroSection } from './components/HeroSection'
import { IntegrationsSection } from './components/IntegrationsSection'
import { FeaturesSection } from './components/FeaturesSection'
import { HowItWorksSection } from './components/HowItWorksSection'
import { ContactFormSection } from './components/ContactFormSection'
import { CtaBanner } from './components/CtaBanner'
import { Footer } from './components/Footer'

export default function OnboardingPage() {
  const navigate = useNavigate()

  const handleStartOnboarding = () => {
    navigate('/app/login')
  }

  return (
    <div className="min-h-screen">
      <Navbar onCtaClick={handleStartOnboarding} />
      <HeroSection onCtaClick={handleStartOnboarding} />
      <IntegrationsSection />
      <FeaturesSection />
      <HowItWorksSection onGetInvited={handleStartOnboarding} />
      <ContactFormSection />
      <CtaBanner onCtaClick={handleStartOnboarding} />
      <Footer />
    </div>
  )
}
