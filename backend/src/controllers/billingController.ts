import { Response } from 'express';
import crypto from 'crypto';
import prisma from '../config/database';
import { AuthRequest } from '../middlewares/auth';

const PLAN_PRICES: Record<string, { monthly: number; annual: number; name: string }> = {
  pro: { monthly: 4900, annual: 47040, name: 'Pro Plan' },
  business: { monthly: 14900, annual: 143040, name: 'Business Plan' },
  enterprise: { monthly: 49900, annual: 479040, name: 'Enterprise Plan' },
};

/**
 * POST /api/billing/create-checkout
 * Creates a mock checkout session (mirrors Stripe's POST /v1/checkout/sessions).
 */
export const createCheckout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { planId, interval = 'MONTHLY' } = req.body;
    const userId = req.user!.userId;

    if (!planId || !PLAN_PRICES[planId]) {
      res.status(400).json({ error: 'Invalid plan selected' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const plan = PLAN_PRICES[planId];
    const amount = interval === 'ANNUAL' ? plan.annual : plan.monthly;
    const mockSessionId = `mock_cs_${crypto.randomBytes(16).toString('hex')}`;
    const mockCustomerId = user.stripeCustomerId || `mock_cus_${crypto.randomBytes(12).toString('hex')}`;

    if (!user.stripeCustomerId) {
      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: mockCustomerId },
      });
    }

    const existing = await prisma.subscription.findUnique({
      where: { barrierxUserId: user.barrierxUserId },
    });

    if (existing) {
      await prisma.subscription.update({
        where: { id: existing.id },
        data: {
          planId,
          planName: plan.name,
          interval: interval as any,
          status: 'INCOMPLETE',
          mockSessionId,
          stripeCustomerId: mockCustomerId,
          amount,
          mockPaymentVerified: false,
        },
      });
    } else {
      await prisma.subscription.create({
        data: {
          barrierxUserId: user.barrierxUserId,
          planId,
          planName: plan.name,
          interval: interval as any,
          status: 'INCOMPLETE',
          mockSessionId,
          stripeCustomerId: mockCustomerId,
          amount,
          currency: 'usd',
        },
      });
    }

    res.json({
      success: true,
      sessionId: mockSessionId,
      customerId: mockCustomerId,
      planId,
      planName: plan.name,
      amount,
      currency: 'usd',
      interval,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Create checkout error:', errMsg, error);
    res.status(500).json({ error: 'Failed to create checkout session', message: errMsg });
  }
};

/**
 * POST /api/billing/verify-payment
 * Simulates 3D-Secure / bank verification (mirrors Stripe's payment confirmation step).
 */
export const verifyPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { sessionId, paymentMethod } = req.body;

    if (!sessionId) {
      res.status(400).json({ error: 'Session ID is required' });
      return;
    }

    const subscription = await prisma.subscription.findUnique({
      where: { mockSessionId: sessionId },
    });

    if (!subscription) {
      res.status(404).json({ error: 'Checkout session not found' });
      return;
    }

    if (subscription.status !== 'INCOMPLETE') {
      res.status(400).json({ error: 'Session already processed' });
      return;
    }

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        mockPaymentVerified: true,
        mockPaymentMethod: paymentMethod || 'mock_pm_visa_4242',
        stripePaymentIntentId: `mock_pi_${crypto.randomBytes(12).toString('hex')}`,
      },
    });

    res.json({
      success: true,
      verified: true,
      sessionId,
      paymentMethod: paymentMethod || 'mock_pm_visa_4242',
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ error: 'Payment verification failed' });
  }
};

/**
 * POST /api/billing/confirm-payment
 * Finalizes the subscription (mirrors Stripe webhook checkout.session.completed).
 */
export const confirmPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.body;
    const userId = req.user!.userId;

    if (!sessionId) {
      res.status(400).json({ error: 'Session ID is required' });
      return;
    }

    const subscription = await prisma.subscription.findUnique({
      where: { mockSessionId: sessionId },
    });

    if (!subscription) {
      res.status(404).json({ error: 'Checkout session not found' });
      return;
    }

    if (!subscription.mockPaymentVerified) {
      res.status(400).json({ error: 'Payment has not been verified yet' });
      return;
    }

    const now = new Date();
    const periodEnd = new Date(now);
    if (subscription.interval === 'ANNUAL') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'ACTIVE',
        stripeSubscriptionId: `mock_sub_${crypto.randomBytes(12).toString('hex')}`,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: {
        onboardingCompleted: true,
        selectedPlan: subscription.planId,
        role: 'ADMIN',
      },
    });

    res.json({
      success: true,
      subscription: {
        id: updatedSubscription.id,
        planId: updatedSubscription.planId,
        planName: updatedSubscription.planName,
        status: updatedSubscription.status,
        interval: updatedSubscription.interval,
        currentPeriodStart: updatedSubscription.currentPeriodStart,
        currentPeriodEnd: updatedSubscription.currentPeriodEnd,
        amount: updatedSubscription.amount,
        currency: updatedSubscription.currency,
      },
    });
  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({ error: 'Payment confirmation failed' });
  }
};

/**
 * GET /api/billing/subscription
 * Returns current user's subscription details.
 */
export const getSubscription = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const subscription = await prisma.subscription.findUnique({
      where: { barrierxUserId: user.barrierxUserId },
    });

    if (!subscription) {
      res.json({ success: true, subscription: null });
      return;
    }

    res.json({
      success: true,
      subscription: {
        id: subscription.id,
        planId: subscription.planId,
        planName: subscription.planName,
        status: subscription.status,
        interval: subscription.interval,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        amount: subscription.amount,
        currency: subscription.currency,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      },
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
};

/**
 * POST /api/billing/onboarding
 * Saves user's business profile data from onboarding step 1.
 */
export const saveOnboardingProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { name, phone, businessType, softwareCategory, averageSalesCycle, averageDealSize } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name && { name }),
        phone,
        businessType,
        softwareCategory,
        averageSalesCycle,
        averageDealSize,
      },
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        businessType: user.businessType,
        softwareCategory: user.softwareCategory,
        averageSalesCycle: user.averageSalesCycle,
        averageDealSize: user.averageDealSize,
      },
    });
  } catch (error) {
    console.error('Save onboarding profile error:', error);
    res.status(500).json({ error: 'Failed to save profile' });
  }
};
