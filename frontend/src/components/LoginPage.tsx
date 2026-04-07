import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as authService from '../services/authService';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authService.login(email, password);

      if (response.success && response.token) {
        authService.setToken(response.token);
        authService.setUser(response.user);

        const onboarded = localStorage.getItem('agentx_onboarded');
        if (onboarded === 'true') {
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
    <div className="min-h-screen dark:bg-background relative flex items-center justify-center p-4 overflow-hidden">
      {/* ── Background Decorations ── */}
      {/* Top-right glow */}
      <div
        className="pointer-events-none absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full blur-[100px]"
        style={{ backgroundColor: 'hsl(var(--app-brand) / 0.06)' }}
      />
      {/* Bottom-left glow */}
      <div
        className="pointer-events-none absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full blur-[80px]"
        style={{ backgroundColor: 'hsl(var(--app-brand) / 0.04)' }}
      />
      {/* Subtle grid pattern */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(hsl(var(--text-heading)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--text-heading)) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          opacity: 0.025,
        }}
      />

      <div className="relative z-10 w-full max-w-[460px]">
        {/* ── AgentX Logo + Tagline ── */}
        <div className="flex flex-col items-center mb-10">
          <div className="flex items-center gap-2.5 mb-3">
            <span className="text-[2.5rem] font-extrabold leading-none tracking-tight text-heading dark:text-foreground select-none">
              Agent
            </span>
            <AgentXIcon className="h-[2.2rem] w-auto" />
          </div>
          <p className="text-body dark:text-muted-foreground text-center text-[0.95rem] leading-relaxed">
            AI-Powered Sales Meeting Automation
          </p>
        </div>

        {/* ── Login Card ── */}
        <Card className="bg-elevated dark:bg-card border border-subtle dark:border-border shadow-card overflow-hidden">
          {/* Decorative top accent bar */}
          <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #2D6A4F, #53A17D, #2D6A4F)' }} />

          <CardContent className="px-8 pt-8 pb-8">
            {/* Header */}
            <div className="text-center mb-7">
              <h2 className="text-2xl font-bold text-heading dark:text-foreground mb-1.5">
                Welcome back
              </h2>
              <p className="text-body dark:text-muted-foreground text-sm">
                Sign in with your BarrierX credentials to continue
              </p>
            </div>

            {/* BarrierX credential notice */}
            <div className="mb-6 rounded-lg border border-[hsl(var(--app-brand))]/20 bg-[hsl(var(--app-brand))]/[0.04] dark:bg-[hsl(var(--app-brand))]/[0.06] px-4 py-3">
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
            <form onSubmit={handleSubmit} className="space-y-5">
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
                className="w-full h-11 bg-brand hover:bg-brand-hover text-white font-semibold transition-all shadow-sm hover:shadow-md"
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
            <div className="flex items-center justify-center gap-1.5 mt-6 pt-5 border-t border-subtle dark:border-border">
              <span className="text-xs text-subtle dark:text-muted-foreground">
                Secured with enterprise-grade encryption
              </span>
            </div>
          </CardContent>
        </Card>

        {/* ── Registration CTA Footer ── */}
        <div className="mt-8 text-center">
          <p className="text-sm text-body dark:text-muted-foreground">
            Don't have a BarrierX account?
          </p>
          <a
            href="https://platform.barrierx.ai/sign-up"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-2 text-sm font-semibold text-brand hover:text-brand-hover transition-colors group"
          >
            Create your account on BarrierX
            <ExternalLink className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </a>
          <div className="flex items-center justify-center gap-2 mt-5">
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
  );
};

export default LoginPage;
