import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Bell, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface ComingSoonProps {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Optional timeline hint (e.g. "On the roadmap for Q3 2026"). */
  eta?: string;
  /** Optional feature bullets shown below the description. */
  highlights?: string[];
}

/**
 * Professional "coming soon" placeholder used for V2 top-tab surfaces
 * that aren't ready to ship yet. Keeps the BarrierX emerald theme and
 * matches the visual language of the rest of the dashboard.
 */
const ComingSoon = ({ icon: Icon, title, description, eta, highlights }: ComingSoonProps) => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleNotify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
    toast.success("You're on the list!", {
      description: `We'll notify ${email} when ${title} is ready.`,
    });
  };

  return (
    <div className="relative mt-5 flex items-center justify-center pb-10 w-full">
      {/* Ambient background glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
        <div className="w-[450px] h-[300px] rounded-full bg-brand/10 blur-[70px] opacity-60 mix-blend-multiply" />
      </div>

      <div className="relative w-full max-w-lg mx-auto">
        {/* Decorative outer border with gradient */}
        <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-b from-brand/30 via-brand/5 to-transparent opacity-70 pointer-events-none" />
        
        <div className="relative bg-white/80 backdrop-blur-xl border border-white/50 rounded-3xl shadow-xl shadow-brand/5 overflow-hidden">
          
          {/* Subtle dot pattern overlay */}
          <div 
            className="absolute inset-0 opacity-[0.4] pointer-events-none" 
            style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(0,0,0,0.08) 1px, transparent 0)', backgroundSize: '18px 18px' }}
          />

          {/* Top accent line */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-brand to-transparent opacity-40" />

          <div className="px-5 sm:px-8 py-8 sm:py-10 flex flex-col items-center text-center relative z-10">
            
            {/* Icon showcase */}
            <div className="relative mb-5 group">
              {/* Inner pulsing glow */}
              <div className="absolute inset-0 rounded-full bg-brand/20 blur-md animate-pulse" />
              
              <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-b from-white to-gray-50/80 border border-gray-200/60 shadow-lg flex items-center justify-center transform transition-transform group-hover:scale-105 group-hover:-translate-y-1 duration-300">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-brand/10 to-transparent opacity-50" />
                <Icon className="h-6 w-6 text-brand relative z-10" strokeWidth={1.5} />
                <Sparkles className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 text-brand/60 animate-pulse" />
              </div>
            </div>

            {/* Status pill */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand/5 border border-brand/10 text-brand text-[10px] font-semibold tracking-widest uppercase mb-4 shadow-sm">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand"></span>
              </span>
              In Development
            </div>

            <h3 className="text-lg sm:text-xl font-bold text-heading mb-2.5 tracking-tight">
              {title}
            </h3>
            <p className="text-sm text-subtle max-w-sm mx-auto leading-relaxed mb-6">
              {description}
            </p>

            {/* Feature highlights grid */}
            {highlights && highlights.length > 0 && (
              <div className="w-full max-w-sm mx-auto grid gap-2 mb-6 text-left">
                {highlights.map((h, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/60 border border-gray-200/60 shadow-sm transition-colors hover:bg-white">
                    <div className="mt-0.5 p-1 rounded-md bg-brand/10 text-brand shrink-0">
                      <CheckCircle2 className="h-3 w-3" />
                    </div>
                    <span className="text-xs text-heading font-medium leading-snug">{h}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Waitlist Form */}
            <div className="w-full max-w-[320px] mx-auto">
              {!submitted ? (
                <form onSubmit={handleNotify} className="relative flex items-center group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Bell className="h-3.5 w-3.5 text-gray-400 group-focus-within:text-brand transition-colors" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email for early access..."
                    className="w-full pl-9 pr-[96px] py-2.5 bg-white/90 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all shadow-sm placeholder:text-gray-400"
                    required
                  />
                  <button
                    type="submit"
                    className="absolute right-1 top-1 bottom-1 px-3 bg-brand text-white text-[11px] font-semibold rounded-lg shadow-sm hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-brand/40 transition-all flex items-center gap-1 group/btn"
                  >
                    Notify me
                    <ArrowRight className="h-3 w-3 transition-transform group-hover/btn:translate-x-0.5" />
                  </button>
                </form>
              ) : (
                <div className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-brand/5 border border-brand/10 rounded-xl text-brand text-xs font-medium animate-in fade-in zoom-in duration-300">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  You're on the waitlist!
                </div>
              )}
            </div>

            {eta && (
              <p className="mt-5 text-[10px] text-gray-400 font-medium tracking-wide uppercase">
                {eta}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComingSoon;
