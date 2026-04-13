import { Response } from 'express';
import axios from 'axios';
import { AuthRequest } from '../middlewares/auth';
import prisma from '../config/database';
import { invalidateUserCache } from '../utils/userCache';
import { config } from '../config/env';

export const toggleEnabled = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { isEnabled } = req.body;

    if (typeof isEnabled !== 'boolean') {
      res.status(400).json({ error: 'isEnabled must be a boolean value' });
      return;
    }

    // Update user in database
    const user = await prisma.user.update({
      where: { id: userId },
      data: { isEnabled },
    });

    // ⚡ Invalidate cache after update
    invalidateUserCache(userId);

    console.log(`✅ User ${user.email} automation ${isEnabled ? 'ENABLED' : 'DISABLED'}`);

    res.json({
      success: true,
      isEnabled: user.isEnabled,
      message: `Automation ${isEnabled ? 'enabled' : 'disabled'} successfully`,
    });
  } catch (error) {
    console.error('Toggle enabled error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
};

export const getCurrentUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isAuth: true,
        isEnabled: true,
        onboardingCompleted: true,
        selectedPlan: true,
        stripeCustomerId: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
};

export const getTenantMembers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { tenantSlug: true },
    });

    if (!user?.tenantSlug) {
      res.status(404).json({ error: 'Tenant not found for this user' });
      return;
    }

    const response = await axios.get(
      `${config.barrierx.baseUrl}/api/external/tenants/${user.tenantSlug}/members`,
      {
        headers: {
          'Authorization': `Bearer ${config.barrierx.apiKey}`,
          'Accept': 'application/json',
        },
        timeout: 15000,
      }
    );

    if (!response.data.ok) {
      res.status(502).json({ error: 'Failed to fetch members from BarrierX' });
      return;
    }

    res.json({
      success: true,
      tenant: user.tenantSlug,
      tenantName: response.data.tenantName,
      count: response.data.count,
      members: response.data.members,
    });
  } catch (error: any) {
    console.error('Get tenant members error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch tenant members' });
  }
};

