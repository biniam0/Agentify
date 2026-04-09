import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import prisma from '../config/database';
import { invalidateUserCache } from '../utils/userCache';

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

