import { useEffect, useState, type FormEvent } from 'react';

import { PlusIcon } from 'lucide-react';
import { toast } from 'sonner';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

import api from '@/services/api';

interface SocialLink {
  id: string;
  platform: string;
  url: string;
  order: number;
}

interface SocialLinksResponse {
  success: boolean;
  links: SocialLink[];
}

// Always show at least 3 input rows for a clean starting UX, even if the user has fewer saved links.
const padToMinimum = (values: string[], minimum = 3) => {
  const next = [...values];
  while (next.length < minimum) next.push('');
  return next;
};

const SocialUrl = () => {
  const [urls, setUrls] = useState<string[]>(['', '', '']);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const { data } = await api.get<SocialLinksResponse>('/user/social-links');
        if (cancelled || !data?.success) return;
        const saved = data.links.map((l) => l.url).filter(Boolean);
        setUrls(padToMinimum(saved));
      } catch (err) {
        console.error('Failed to load social links:', err);
        toast.error('Failed to load social URLs');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const addUrl = () => setUrls((prev) => [...prev, '']);

  const updateUrl = (index: number, value: string) =>
    setUrls((prev) => prev.map((u, i) => (i === index ? value : u)));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    try {
      const payload = {
        links: urls
          .map((url) => url.trim())
          .filter((url) => url.length > 0)
          .map((url) => ({ url })),
      };
      const { data } = await api.put<SocialLinksResponse>('/user/social-links', payload);
      if (data?.success) {
        const saved = data.links.map((l) => l.url);
        setUrls(padToMinimum(saved));
        toast.success('Social URLs saved');
      }
    } catch (err) {
      console.error('Failed to save social links:', err);
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Failed to save social URLs';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-10 lg:grid-cols-3">
      <div className="flex flex-col">
        <h3 className="text-foreground font-semibold">Social URLs</h3>
        <p className="text-muted-foreground text-sm">Manage your social URLs.</p>
      </div>

      <div className="space-y-6 lg:col-span-2">
        <div className="space-y-4">
          {urls.map((url, idx) => (
            <Input
              key={idx}
              type="text"
              placeholder="Link to social profile"
              value={url}
              onChange={(e) => updateUrl(idx, e.target.value)}
              disabled={loading}
            />
          ))}
        </div>
        <div className="flex items-center justify-between gap-4">
          <Button type="button" variant="outline" onClick={addUrl} disabled={loading}>
            <PlusIcon className="size-4" />
            Add URL
          </Button>
          <Button type="submit" variant="gradientEmerald" disabled={loading || saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default SocialUrl;
