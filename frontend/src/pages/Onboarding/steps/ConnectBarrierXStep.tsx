import { useState } from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, ArrowLeft, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import * as authService from '@/services/authService';

export default function ConnectBarrierXStep() {
  const { state, setBarrierXConnected, setCurrentStep } = useOnboarding();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isAlreadyConnected = authService.isAuthenticated();
  const isConnected = state.barrierxConnected || isAlreadyConnected;

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authService.login(email, password);

      if (response.success && response.token) {
        authService.setToken(response.token);
        authService.setUser(response.user);
        setBarrierXConnected(true);
      } else {
        setError('Connection failed. Please check your credentials.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAlreadyConnected = () => {
    setBarrierXConnected(true);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-heading dark:text-foreground">
          Connect BarrierX
        </h1>
        <p className="text-sm text-body dark:text-muted-foreground mt-2">
          Link your BarrierX account to enable AI-powered sales intelligence
        </p>
      </div>

      {isConnected ? (
        <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center">
              <svg viewBox="0 0 42 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-auto">
                <path d="M42 28H28V14L42 28Z" fill="#53A17D" />
                <path d="M28 14V0L42 2.00272e-06L28 14Z" fill="#2D6A4F" />
                <path d="M14 28V14H28L14 28Z" fill="#2D6A4F" />
                <path d="M28 14H14V0L28 14Z" fill="#53A17D" />
                <path d="M14 28H0L14 14V28Z" fill="#53A17D" />
                <path d="M14 14L0 0H14V14Z" fill="#53A17D" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-green-800 dark:text-green-300">BarrierX Connected</p>
              <p className="text-sm text-green-600 dark:text-green-400 mt-0.5">
                {authService.getUser()?.email
                  ? `Connected as ${authService.getUser()?.email}`
                  : 'Your BarrierX account is linked to AgentX'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Already logged in shortcut */}
          {isAlreadyConnected && (
            <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 cursor-pointer hover:shadow-md transition-shadow"
              onClick={handleAlreadyConnected}
            >
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
                <svg viewBox="0 0 42 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-auto">
                <path d="M42 28H28V14L42 28Z" fill="#53A17D" />
                <path d="M28 14V0L42 2.00272e-06L28 14Z" fill="#2D6A4F" />
                <path d="M14 28V14H28L14 28Z" fill="#2D6A4F" />
                <path d="M28 14H14V0L28 14Z" fill="#53A17D" />
                <path d="M14 28H0L14 14V28Z" fill="#53A17D" />
                <path d="M14 14L0 0H14V14Z" fill="#53A17D" />
              </svg>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-blue-800 dark:text-blue-300">You're already logged in</p>
                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-0.5">
                    Click here to use your current session to connect
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-blue-400" />
              </CardContent>
            </Card>
          )}

          {!isAlreadyConnected && (
            <div className="text-center text-sm text-subtle dark:text-muted-foreground">
              or sign in with your BarrierX credentials
            </div>
          )}

          {/* Login form */}
          <Card className="border-subtle dark:border-border shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 dark:bg-brand/20">
                  <svg viewBox="0 0 42 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-auto">
                    <path d="M42 28H28V14L42 28Z" fill="#53A17D" />
                    <path d="M28 14V0L42 2.00272e-06L28 14Z" fill="#2D6A4F" />
                    <path d="M14 28V14H28L14 28Z" fill="#2D6A4F" />
                    <path d="M28 14H14V0L28 14Z" fill="#53A17D" />
                    <path d="M14 28H0L14 14V28Z" fill="#53A17D" />
                    <path d="M14 14L0 0H14V14Z" fill="#53A17D" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-heading dark:text-foreground text-sm">Sign in with BarrierX</p>
                  <p className="text-xs text-subtle dark:text-muted-foreground">Use your BarrierX credentials</p>
                </div>
              </div>

              <form onSubmit={handleConnect} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-body dark:text-foreground font-medium text-sm">Email</Label>
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="h-11 border-default dark:border-border focus:border-[hsl(var(--app-brand))] focus:ring-[hsl(var(--app-brand))]/20"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-body dark:text-foreground font-medium text-sm">Password</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="h-11 pr-10 border-default dark:border-border focus:border-[hsl(var(--app-brand))] focus:ring-[hsl(var(--app-brand))]/20"
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
                  className="w-full h-11 bg-brand hover:bg-brand-hover text-white font-medium"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Connecting...
                    </span>
                  ) : (
                    'Connect BarrierX'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button
          variant="ghost"
          onClick={() => setCurrentStep(0)}
          className="text-body dark:text-muted-foreground gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={() => setCurrentStep(2)}
          disabled={!isConnected}
          className="bg-brand hover:bg-brand-hover text-white font-medium px-6 h-11 gap-2"
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
