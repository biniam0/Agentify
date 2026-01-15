import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as authService from '../services/authService';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';

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
        navigate('/meetings');
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-[515px]">
        {/* AgentX Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-4xl font-bold leading-none tracking-tight text-slate-900">
              Agent
            </span>
            <svg
              className="h-[2rem] w-auto"
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
          </div>
          <p className="text-slate-600 text-center">AI-Powered Sales Meeting Automation</p>
        </div>

        {/* Login Card */}
        <Card className="bg-white border border-slate-100 shadow-sm overflow-hidden">
          <CardContent className="p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome back</h2>
              <p className="text-slate-600">Enter your credentials to access your account</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 font-medium">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your-email@barrierx.ai"
                  className="h-11 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700 font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 pr-10 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-[#2D6A4F] hover:bg-[#236141] text-white font-medium transition-all"
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
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-slate-500 mt-6">
          Automate your sales calls with intelligence
        </p>
      </div>
    </div>
  );
};

export default LoginPage;

