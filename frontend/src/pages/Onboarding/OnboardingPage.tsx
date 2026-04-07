import { useNavigate } from 'react-router-dom'
import { isAuthenticated, getUser } from '@/services/authService'
import { Navbar } from './components/Navbar'
import { HeroSection } from './components/HeroSection'
import { IntegrationsSection } from './components/IntegrationsSection'
import { FeaturesSection } from './components/FeaturesSection'
import { HowItWorksSection } from './components/HowItWorksSection'
import { ContactFormSection } from './components/ContactFormSection'
import { CtaBanner } from './components/CtaBanner'
import { Footer } from './components/Footer'

const BARRIERX_SIGNUP_URL = 'https://platform.barrierx.ai/sign-up'

export default function OnboardingPage() {
  const navigate = useNavigate()

  const handleStartOnboarding = () => {
    if (!isAuthenticated()) {
      window.location.href = BARRIERX_SIGNUP_URL
      return
    }

    const user = getUser()
    if (user?.onboardingCompleted) {
      navigate('/app/v2')
    } else {
      navigate('/app/onboarding')
    }
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
