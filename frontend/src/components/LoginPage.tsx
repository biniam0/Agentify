import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as authService from '../services/authService';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { AlertCircle, Eye, EyeOff, Shield } from 'lucide-react';

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
    <div className="min-h-screen bg-page dark:bg-background relative flex items-center justify-center p-4 overflow-hidden">
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
                Sign in to your AgentX account to continue
              </p>
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
              <Shield className="h-3.5 w-3.5 text-subtle dark:text-muted-foreground" />
              <span className="text-xs text-subtle dark:text-muted-foreground">
                Secured with enterprise-grade encryption
              </span>
            </div>
          </CardContent>
        </Card>

        {/* ── Powered by BarrierX Footer ── */}
        <div className="flex flex-col items-center mt-8 gap-3">
          <span className="text-[0.65rem] text-subtle dark:text-muted-foreground tracking-[0.15em] uppercase font-medium">
            Powered by
          </span>
          <div className="flex items-center gap-1">
            <span className="text-2xl font-bold tracking-tight text-heading dark:text-foreground select-none leading-none">
              Barrier
            </span>
            <AgentXIcon className="h-[1.4rem] w-auto" />
          </div>
          <p className="text-[0.7rem] text-subtle dark:text-muted-foreground text-center leading-relaxed">
            Intelligent sales automation platform
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
