import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type SectionScope = 'Personal' | 'Platform' | 'Read-only' | 'Dangerous';

interface SectionPlaceholderProps {
  title: string;
  description: string;
  scope: SectionScope;
}

const scopeBadgeClass: Record<SectionScope, string> = {
  Personal: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
  Platform: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900',
  'Read-only': 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
  Dangerous: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900',
};

const SectionPlaceholder = ({ title, description, scope }: SectionPlaceholderProps) => {
  return (
    <section className="py-1">
      <div className="flex items-center gap-2 flex-wrap">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <Badge
          variant="outline"
          className={cn('text-[10px] uppercase tracking-wide', scopeBadgeClass[scope])}
        >
          {scope}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>

      <div className="mt-6 rounded-xl border border-dashed border-default p-8 text-center">
        <p className="text-sm text-muted-foreground">Coming soon.</p>
      </div>
    </section>
  );
};

export default SectionPlaceholder;
