import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import prisma from '../config/database';

const ALLOWED_PROVIDERS = [
  'HUBSPOT',
  'SALESFORCE',
  'PIPEDRIVE',
  'GONG',
  'SLACK',
  'GOOGLE',
  'NOTION',
] as const;
type ProviderValue = (typeof ALLOWED_PROVIDERS)[number];

const isProvider = (value: unknown): value is ProviderValue =>
  typeof value === 'string' && (ALLOWED_PROVIDERS as readonly string[]).includes(value.toUpperCase());

const normalizeProvider = (value: string): ProviderValue | null => {
  const upper = value.toUpperCase();
  return (ALLOWED_PROVIDERS as readonly string[]).includes(upper) ? (upper as ProviderValue) : null;
};

export const listIntegrations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const integrations = await prisma.userIntegration.findMany({
      where: { userId },
      select: {
        id: true,
        provider: true,
        status: true,
        externalAccountId: true,
        connectedAt: true,
        disconnectedAt: true,
        metadata: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ success: true, integrations });
  } catch (error) {
    console.error('List integrations error:', error);
    res.status(500).json({ error: 'Failed to fetch integrations' });
  }
};

// Mocked connect — real OAuth will replace this body later. Creates or updates the row
// and flips status to CONNECTED so the frontend toggle reflects state.
export const connectIntegration = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const providerParam = req.params.provider;
    if (!providerParam || !isProvider(providerParam)) {
      res.status(400).json({ error: 'Unknown integration provider' });
      return;
    }

    const provider = normalizeProvider(providerParam) as ProviderValue;

    const integration = await prisma.userIntegration.upsert({
      where: { userId_provider: { userId, provider } },
      create: {
        userId,
        provider,
        status: 'CONNECTED',
        connectedAt: new Date(),
      },
      update: {
        status: 'CONNECTED',
        connectedAt: new Date(),
        disconnectedAt: null,
      },
      select: {
        id: true,
        provider: true,
        status: true,
        connectedAt: true,
        disconnectedAt: true,
      },
    });

    res.json({ success: true, integration });
  } catch (error) {
    console.error('Connect integration error:', error);
    res.status(500).json({ error: 'Failed to connect integration' });
  }
};

export const disconnectIntegration = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const providerParam = req.params.provider;
    if (!providerParam || !isProvider(providerParam)) {
      res.status(400).json({ error: 'Unknown integration provider' });
      return;
    }

    const provider = normalizeProvider(providerParam) as ProviderValue;

    const integration = await prisma.userIntegration.upsert({
      where: { userId_provider: { userId, provider } },
      create: {
        userId,
        provider,
        status: 'DISCONNECTED',
        disconnectedAt: new Date(),
      },
      update: {
        status: 'DISCONNECTED',
        disconnectedAt: new Date(),
        accessTokenEnc: null,
        refreshTokenEnc: null,
        tokenExpiresAt: null,
      },
      select: {
        id: true,
        provider: true,
        status: true,
        connectedAt: true,
        disconnectedAt: true,
      },
    });

    res.json({ success: true, integration });
  } catch (error) {
    console.error('Disconnect integration error:', error);
    res.status(500).json({ error: 'Failed to disconnect integration' });
  }
};
