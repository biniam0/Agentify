import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import prisma from '../config/database';

const ALLOWED_PLATFORMS = [
  'LINKEDIN',
  'TWITTER',
  'GITHUB',
  'FACEBOOK',
  'INSTAGRAM',
  'YOUTUBE',
  'WEBSITE',
  'OTHER',
] as const;
type PlatformValue = (typeof ALLOWED_PLATFORMS)[number];

const isPlatform = (value: unknown): value is PlatformValue =>
  typeof value === 'string' && (ALLOWED_PLATFORMS as readonly string[]).includes(value);

// Best-effort inference so the client can just send a URL and we store a nice enum.
const inferPlatform = (url: string): PlatformValue => {
  const normalized = url.toLowerCase();
  if (normalized.includes('linkedin.com')) return 'LINKEDIN';
  if (normalized.includes('twitter.com') || normalized.includes('x.com')) return 'TWITTER';
  if (normalized.includes('github.com')) return 'GITHUB';
  if (normalized.includes('facebook.com')) return 'FACEBOOK';
  if (normalized.includes('instagram.com')) return 'INSTAGRAM';
  if (normalized.includes('youtube.com') || normalized.includes('youtu.be')) return 'YOUTUBE';
  if (/^https?:\/\//i.test(url)) return 'WEBSITE';
  return 'OTHER';
};

export const listSocialLinks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const links = await prisma.userSocialLink.findMany({
      where: { userId },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, platform: true, url: true, order: true },
    });

    res.json({ success: true, links });
  } catch (error) {
    console.error('List social links error:', error);
    res.status(500).json({ error: 'Failed to fetch social links' });
  }
};

// Bulk replace — matches the UI where the whole list is saved at once.
// Empty URLs are skipped so blank input rows don't pollute the DB.
export const replaceSocialLinks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const body = req.body ?? {};
    const rawLinks: unknown = body.links;

    if (!Array.isArray(rawLinks)) {
      res.status(400).json({ error: 'links must be an array' });
      return;
    }

    const cleaned = rawLinks
      .map((item, index) => {
        if (!item || typeof item !== 'object') return null;
        const rec = item as Record<string, unknown>;
        const url = typeof rec.url === 'string' ? rec.url.trim() : '';
        if (!url) return null;

        const platform = isPlatform(rec.platform) ? (rec.platform as PlatformValue) : inferPlatform(url);
        return { url, platform, order: index };
      })
      .filter((v): v is { url: string; platform: PlatformValue; order: number } => v !== null);

    const replaced = await prisma.$transaction(async (tx) => {
      await tx.userSocialLink.deleteMany({ where: { userId } });
      if (cleaned.length > 0) {
        await tx.userSocialLink.createMany({
          data: cleaned.map((l) => ({ ...l, userId })),
        });
      }
      return tx.userSocialLink.findMany({
        where: { userId },
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        select: { id: true, platform: true, url: true, order: true },
      });
    });

    res.json({ success: true, links: replaced });
  } catch (error) {
    console.error('Replace social links error:', error);
    res.status(500).json({ error: 'Failed to save social links' });
  }
};
