import type { LucideIcon } from 'lucide-react';
import { Bell } from 'lucide-react';
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
  const handleNotify = () => {
    toast.success("We'll let you know the moment it's ready.", {
      description: `You're on the list for ${title}.`,
    });
  };

  return (
    <div className="relative mt-4 flex items-center justify-center pb-16">
      {/* Ambient brand glow behind the card */}
      <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="w-[520px] h-[520px] max-w-full rounded-full bg-brand/10 blur-3xl opacity-60" />
      </div>

      <div className="relative w-full max-w-xl mx-auto text-center px-8 sm:px-10 py-14 sm:py-16 bg-white/90 backdrop-blur-sm border border-default rounded-2xl shadow-sm">
        {/* Icon bubble with pulsing brand halo */}
        <div className="relative mx-auto w-16 h-16 mb-6">
          <span aria-hidden className="absolute inset-0 rounded-full bg-brand/25 animate-ping opacity-60" />
          <span aria-hidden className="absolute -inset-1 rounded-full bg-brand/10" />
          <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-brand to-brand/70 flex items-center justify-center shadow-lg shadow-brand/20 ring-4 ring-white">
            <Icon className="h-7 w-7 text-white" strokeWidth={2} />
          </div>
        </div>

        {/* Status pill */}
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-brand/10 text-brand text-[11px] font-semibold tracking-wider uppercase mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
          Coming soon
        </span>

        <h3 className="text-xl sm:text-2xl font-semibold text-heading mb-2 tracking-tight">
          {title}
        </h3>
        <p className="text-sm text-subtle max-w-md mx-auto leading-relaxed">
          {description}
        </p>

        {/* Optional highlight bullets */}
        {highlights && highlights.length > 0 && (
          <ul className="mt-6 space-y-2 text-left max-w-sm mx-auto">
            {highlights.map((h) => (
              <li key={h} className="flex items-start gap-2.5 text-sm text-heading">
                <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-brand shrink-0" />
                <span className="leading-relaxed">{h}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Notify me action */}
        <button
          type="button"
          onClick={handleNotify}
          className="mt-8 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand text-white text-sm font-semibold shadow-sm hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 transition-all"
        >
          <Bell className="h-4 w-4" />
          Notify me when it's ready
        </button>

        {eta && (
          <p className="mt-5 text-[11px] text-subtle tracking-wide">{eta}</p>
        )}
      </div>
    </div>
  );
};

export default ComingSoon;
