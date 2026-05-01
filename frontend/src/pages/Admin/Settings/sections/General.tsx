import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import PersonalInfo from '@/pages/V2/Settings/components/PersonalInfo';

const scopeBadgeClass =
  'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';

const General = () => {
  return (
    <section className="py-1 space-y-8">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-lg font-semibold text-foreground">General</h2>
          <Badge
            variant="outline"
            className={cn('text-[10px] uppercase tracking-wide', scopeBadgeClass)}
          >
            Personal
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Personal preferences for your super admin account.
        </p>
      </div>

      <PersonalInfo />
    </section>
  );
};

export default General;
