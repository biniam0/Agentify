import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as authService from '../services/authService';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { AlertCircle, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { GeometricX } from '@/pages/Onboarding/components/phone-slides/GeometricX';

/* ─── Inline SVG Components ─── */

/** The geometric "X" logo used for AgentX branding */
const AgentXIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 42 28"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M42 28H28V14L42 28Z" fill="#53A17D" />
    <path d="M28 14V0L42 2.00272e-06L28 14Z" fill="#2D6A4F" />
    <path d="M14 28V14H28L14 28Z" fill="#2D6A4F" />
    <path d="M28 14H14V0L28 14Z" fill="#53A17D" />
    <path d="M14 28H0L14 14V28Z" fill="#53A17D" />
    <path d="M14 14L0 0H14V14Z" fill="#53A17D" />
  </svg>
);

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const { login: authLogin } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authService.login(email, password);

      if (response.success && response.user) {
        authLogin(response.user);

        if (response.user.onboardingCompleted) {
          navigate('/app/v2');
        } else {
          navigate('/app/onboarding');
        }
      } else {
        setError('Login failed. Please try again.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex overflow-hidden relative dark:bg-background">
      {/* Background Decorations (shared across both panels) */}
      <div
        className="pointer-events-none absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full blur-[100px] z-0"
        style={{ backgroundColor: 'hsl(var(--app-brand) / 0.06)' }}
      />
      <div
        className="pointer-events-none absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full blur-[80px] z-0"
        style={{ backgroundColor: 'hsl(var(--app-brand) / 0.04)' }}
      />
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage:
            'linear-gradient(hsl(var(--text-heading)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--text-heading)) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          opacity: 0.025,
        }}
      />

      {/* ── Left: Login Form ── */}
      <div className="w-full lg:w-1/2 relative z-[1] flex items-center justify-center p-4 overflow-y-auto overflow-x-hidden">
        <div className="relative z-10 w-full max-w-[460px]">
          {/* ── AgentX Logo + Tagline ── */}
          <div className="flex flex-col items-center mb-6 2xl:mb-10">
            <div className="flex items-center gap-2.5 mb-2 2xl:mb-3">
              <span className="text-[2rem] 2xl:text-[2.5rem] font-bold leading-none tracking-tight text-heading dark:text-foreground select-none">
                Agent
              </span>
              <AgentXIcon className="h-[1.8rem] 2xl:h-[2.2rem] w-auto" />
            </div>
            <p className="text-body dark:text-muted-foreground text-center text-sm 2xl:text-[0.95rem] leading-relaxed">
              AI-Powered Sales Meeting Automation
            </p>
          </div>

          {/* ── Login Card ── */}
          <Card className="bg-elevated dark:bg-card border border-subtle dark:border-border shadow-card overflow-hidden">
            {/* Decorative top accent bar */}
            <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #2D6A4F, #53A17D, #2D6A4F)' }} />

            <CardContent className="px-8 pt-6 pb-6 2xl:pt-8 2xl:pb-8">
              {/* Header */}
              <div className="text-center mb-5 2xl:mb-7">
                <h2 className="text-2xl font-semibold text-heading dark:text-foreground mb-1.5">
                  Welcome back
                </h2>
                <p className="text-body dark:text-muted-foreground text-sm">
                  Sign in with your BarrierX credentials to continue
                </p>
              </div>

              {/* BarrierX credential notice */}
              <div className="mb-4 2xl:mb-6 rounded-lg border border-[hsl(var(--app-brand))]/20 bg-[hsl(var(--app-brand))]/[0.04] dark:bg-[hsl(var(--app-brand))]/[0.06] px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="text-[13px] leading-relaxed">
                    <span className="text-heading dark:text-foreground font-medium whitespace-nowrap">
                      Agent<span className="inline-block"><GeometricX className="h-2.5 w-auto" /></span> uses BarrierX for authentication.
                    </span>
                    <span className="text-body dark:text-muted-foreground"> Use your existing BarrierX account to sign in.</span>
                  </div>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4 2xl:space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-body dark:text-foreground font-medium text-sm">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@barrierx.ai"
                    className="h-11 border-default dark:border-border focus:border-[hsl(var(--app-brand))] focus:ring-[hsl(var(--app-brand))]/20 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-body dark:text-foreground font-medium text-sm">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="h-11 pr-10 border-default dark:border-border focus:border-[hsl(var(--app-brand))] focus:ring-[hsl(var(--app-brand))]/20 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle hover:text-body dark:hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive" className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  variant="gradientEmerald"
                  className="w-full h-11 transition-all hover:shadow-md"
                  size="lg"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Signing in...
                    </span>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>

              {/* Security badge inside card */}
              <div className="flex items-center justify-center gap-1.5 mt-4 pt-4 2xl:mt-6 2xl:pt-5 border-t border-subtle dark:border-border">
                <span className="text-xs text-subtle dark:text-muted-foreground">
                  Secured with enterprise-grade encryption
                </span>
              </div>
            </CardContent>
          </Card>

          {/* ── Registration CTA Footer ── */}
          <div className="mt-5 2xl:mt-8 text-center">
            <p className="text-sm text-body dark:text-muted-foreground">
              Don't have a BarrierX account?
            </p>
            <a
              href="https://platform.barrierx.ai/sign-up"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-2 text-sm font-medium text-brand hover:text-brand-hover transition-colors group"
            >
              Create your account on BarrierX
              <ExternalLink className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </a>
            <div className="flex items-center justify-center gap-2 mt-3 2xl:mt-5">
              <span className="text-[0.65rem] mt-1 text-subtle dark:text-muted-foreground tracking-[0.1em] uppercase font-medium leading-none">
                Powered by
              </span>

              <div className="flex items-center gap-1">
                <span className="text-lg font-bold tracking-tight text-heading dark:text-foreground leading-none">
                  Barrier
                </span>
                <AgentXIcon className="h-4 w-auto" />
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* ── Right: Decorative Panel (hidden on mobile) ── */}
      <div className="hidden lg:block lg:w-1/2 p-4 shrink-0">
        <div className="relative overflow-hidden rounded-xl h-full">
          {/* Background image */}
          <img
            alt="Background"
            src="/images/green-bg.png"
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Content overlay */}
          <div className="relative z-10 flex flex-col px-6 lg:px-8 2xl:px-14 py-4 lg:py-6 2xl:py-12 h-full w-full overflow-y-auto">
            {/* Title + Description */}
            <div className="mb-4 2xl:mb-8 shrink-0">
              <h2
                className="text-[1.75rem] lg:text-[2rem] 2xl:text-[3rem] font-medium leading-tight mb-2 2xl:mb-3"
                style={{ color: '#05603A' }}
              >
                Your AI Sales Meeting Assistant
              </h2>
              <p
                className="text-[13px] 2xl:text-base font-medium leading-relaxed max-w-lg"
                style={{ color: '#05603A' }}
              >
                AgentX automates your sales meetings — from prep to follow-up.
                Get AI-generated insights, real-time coaching, and automated
                action items for every call.
              </p>
            </div>

            {/* Performance Metrics — glass card (large) */}
            <div className="relative rounded-xl overflow-hidden mb-3 2xl:mb-6 ml-2 shrink-0" style={{ maxWidth: 420 }}>
              <div className="absolute inset-0 backdrop-blur-xl bg-white/25" />
              <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-white/10 to-transparent" />
              <div className="absolute inset-0 border border-white/40 rounded-xl" />
              <div className="relative z-10 p-3 2xl:p-5">
                <p className="text-sm 2xl:text-[15px] font-semibold" style={{ color: '#414651' }}>Performance Metrics</p>
                <p className="text-[11px] 2xl:text-xs mt-0.5 mb-2 2xl:mb-4" style={{ color: '#535862' }}>Key performance indicators for monitoring business growth.</p>
                {/* Simplified chart placeholder */}
                <svg viewBox="0 0 360 140" className="w-full max-h-[130px] 2xl:max-h-none" preserveAspectRatio="xMidYMid meet" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <line x1="40" y1="10" x2="40" y2="120" stroke="#e5e7eb" strokeWidth="0.5" />
                  <line x1="40" y1="120" x2="350" y2="120" stroke="#e5e7eb" strokeWidth="0.5" />
                  {/* Y-axis labels */}
                  <text x="20" y="24" fontSize="10" fill="#9ca3af">8</text>
                  <text x="20" y="46" fontSize="10" fill="#9ca3af">6</text>
                  <text x="20" y="68" fontSize="10" fill="#9ca3af">4</text>
                  <text x="20" y="90" fontSize="10" fill="#9ca3af">2</text>
                  <text x="20" y="112" fontSize="10" fill="#9ca3af">0</text>
                  {/* Grid lines */}
                  {[24, 46, 68, 90].map((y) => (
                    <line key={y} x1="40" y1={y - 4} x2="350" y2={y - 4} stroke="#f3f4f6" strokeWidth="0.5" />
                  ))}
                  {/* X-axis labels */}
                  {['Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon'].map((d, i) => (
                    <text key={d} x={62 + i * 44} y="135" fontSize="10" fill="#9ca3af" textAnchor="middle">{d}</text>
                  ))}
                  {/* Orange line (metric 1) */}
                  <polyline
                    points="62,52 106,48 150,42 194,50 238,55 282,50 326,48"
                    stroke="#f59e0b"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Green line (metric 2) */}
                  <polyline
                    points="62,58 106,55 150,48 194,62 238,65 282,60 326,58"
                    stroke="#53A17D"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Vertical indicator line */}
                  <line x1="194" y1="20" x2="194" y2="120" stroke="#414651" strokeWidth="1" strokeDasharray="3 2" />
                  <circle cx="194" cy="50" r="4" fill="white" stroke="#414651" strokeWidth="1.5" />
                  {/* Tooltip */}
                  <rect x="140" y="4" width="108" height="40" rx="6" fill="#414651" />
                  <text x="150" y="18" fontSize="9" fill="white" fontWeight="600">Friday</text>
                  <text x="150" y="29" fontSize="8" fill="#d1d5db">Client-facing hours: 5</text>
                  <text x="150" y="39" fontSize="8" fill="#d1d5db">Task completed: 3</text>
                </svg>
              </div>
            </div>

            {/* Discovery card — glass card (small, offset right) */}
            <div className="relative rounded-xl overflow-hidden mb-3 2xl:mb-6 ml-auto mr-4 shrink-0" style={{ maxWidth: 340 }}>
              <div className="absolute inset-0 backdrop-blur-xl bg-white/25" />
              <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-white/10 to-transparent" />
              <div className="absolute inset-0 border border-white/40 rounded-xl" />
              <div className="relative z-10 p-3 2xl:p-5">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm 2xl:text-[15px] font-semibold" style={{ color: '#414651' }}>Meeting Analysis</p>
                  <span className="text-[10px] 2xl:text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#53A17D]/15 text-[#2D6A4F]">Completed</span>
                </div>
                <p className="text-[11px] 2xl:text-xs mb-2.5 2xl:mb-3" style={{ color: '#535862' }}>May 29, 2025 &middot; 6:28 AM &middot; 59 Minutes</p>
                <div className="flex gap-4 2xl:gap-6">
                  <div>
                    <span className="text-[11px] 2xl:text-xs font-semibold text-[#6366f1]">Talk : 60%</span>
                    <div className="w-14 2xl:w-16 h-1.5 rounded-full bg-gray-200 mt-1"><div className="h-full rounded-full bg-[#6366f1]" style={{ width: '60%' }} /></div>
                  </div>
                  <div>
                    <span className="text-[11px] 2xl:text-xs font-semibold text-[#ef4444]">Listen : 41%</span>
                    <div className="w-14 2xl:w-16 h-1.5 rounded-full bg-gray-200 mt-1"><div className="h-full rounded-full bg-[#ef4444]" style={{ width: '41%' }} /></div>
                  </div>
                  <div>
                    <span className="text-[11px] 2xl:text-xs font-semibold text-[#14b8a6]">Score : 10%</span>
                    <div className="w-14 2xl:w-16 h-1.5 rounded-full bg-gray-200 mt-1"><div className="h-full rounded-full bg-[#14b8a6]" style={{ width: '10%' }} /></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Testimonial — glass card (bottom) */}
            <div className="relative rounded-xl overflow-hidden mt-auto shrink-0">
              <div className="absolute inset-0 backdrop-blur-xl bg-white/25" />
              <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-white/10 to-transparent" />
              <div className="absolute inset-0 border border-white/40 rounded-xl" />
              <div className="relative z-10 p-3 lg:p-4 2xl:p-6">
                {/* Stars */}
                <div className="flex gap-1 mb-2 2xl:mb-3">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-4 h-4 2xl:w-5 2xl:h-5" viewBox="0 0 20 20" fill="#f59e0b">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                {/* Quote */}
                <p className="text-[13px] lg:text-[13px] 2xl:text-base font-medium leading-relaxed mb-3 2xl:mb-4" style={{ color: '#05603A' }}>
                  "Since we started using AgentX, our reps save 5+ hours per week on meeting prep and follow-ups. It's like having a personal coach for every rep — without the overhead."
                </p>
                {/* Footer */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs 2xl:text-sm font-semibold" style={{ color: '#05603A' }}>Sohrab - Orq</p>
                    <p className="text-[10px] 2xl:text-xs font-semibold" style={{ color: '#05603A' }}>Founder & CEO</p>
                  </div>
                  <div className="flex gap-1.5 2xl:gap-2">
                    <button type="button" className="opacity-90 hover:opacity-100 transition-opacity" tabIndex={-1}>
                      <svg className="w-5 h-5 2xl:w-[23px] 2xl:h-[23px]" viewBox="0 0 28 28" stroke="#05603A" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <path strokeWidth="1.5" d="M14 9.333 9.335 14m0 0 4.667 4.667M9.334 14h9.333m7 0c0 6.443-5.223 11.667-11.666 11.667S2.334 20.443 2.334 14 7.557 2.333 14.001 2.333c6.443 0 11.666 5.224 11.666 11.667" opacity="0.9" />
                      </svg>
                    </button>
                    <button type="button" className="opacity-90 hover:opacity-100 transition-opacity" tabIndex={-1}>
                      <svg className="w-5 h-5 2xl:w-[23px] 2xl:h-[23px]" viewBox="0 0 28 28" stroke="#05603A" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'scaleX(-1)' }}>
                        <path strokeWidth="1.5" d="M14 9.333 9.335 14m0 0 4.667 4.667M9.334 14h9.333m7 0c0 6.443-5.223 11.667-11.666 11.667S2.334 20.443 2.334 14 7.557 2.333 14.001 2.333c6.443 0 11.666 5.224 11.666 11.667" opacity="0.9" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default LoginPage;
