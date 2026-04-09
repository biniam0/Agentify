import { Request, Response } from 'express';
import StripeLib from 'stripe';
import type { Stripe } from 'stripe/cjs/stripe.core';
import prisma from '../config/database';
import { AuthRequest } from '../middlewares/auth';
import { config } from '../config/env';

const stripe: Stripe = StripeLib(config.stripe.secretKey);

const PRICE_MAP: Record<string, { monthly: string; annual: string; name: string }> = {
  pro: {
    monthly: config.stripe.prices.pro.monthly,
    annual: config.stripe.prices.pro.annual,
    name: 'Pro Plan',
  },
  business: {
    monthly: config.stripe.prices.business.monthly,
    annual: config.stripe.prices.business.annual,
    name: 'Business Plan',
  },
  enterprise: {
    monthly: config.stripe.prices.enterprise.monthly,
    annual: config.stripe.prices.enterprise.annual,
    name: 'Enterprise Plan',
  },
};

/**
 * POST /api/billing/create-checkout
 * Creates a Stripe Checkout Session and returns the URL for redirect.
 */
export const createCheckout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { planId, interval = 'MONTHLY' } = req.body;
    const userId = req.user!.userId;

    if (!planId || !PRICE_MAP[planId]) {
      res.status(400).json({ error: 'Invalid plan selected' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const plan = PRICE_MAP[planId];
    const priceId = interval === 'ANNUAL' ? plan.annual : plan.monthly;

    if (!priceId) {
      res.status(400).json({ error: 'Price not configured for this plan/interval' });
      return;
    }

    let customerId = user.stripeCustomerId;

    // Legacy compatibility: earlier mock flow stored ids like `mock_cus_*` in DB.
    // Stripe only accepts real customer ids like `cus_*`.
    const looksLikeStripeCustomerId = (id: string) => id.startsWith('cus_');
    if (customerId && !looksLikeStripeCustomerId(customerId)) {
      customerId = null;
    }

    if (customerId) {
      try {
        const existingCustomer = await stripe.customers.retrieve(customerId);
        if ((existingCustomer as Stripe.DeletedCustomer).deleted) {
          customerId = null;
        }
      } catch {
        customerId = null;
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user.id, barrierxUserId: user.barrierxUserId },
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      });
    }

    const successUrl = `${config.frontendUrl}/app/onboarding?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${config.frontendUrl}/app/onboarding?checkout=cancel`;

    const createSession = (custId: string) =>
      stripe.checkout.sessions.create({
        customer: custId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          userId: user.id,
          barrierxUserId: user.barrierxUserId,
          planId,
          interval,
        },
        subscription_data: {
          metadata: {
            userId: user.id,
            barrierxUserId: user.barrierxUserId,
            planId,
          },
        },
      });

    let session: Stripe.Checkout.Session;
    try {
      session = await createSession(customerId!);
    } catch (e: unknown) {
      const err = e as { code?: string; param?: string };
      if (err?.code === 'resource_missing' && err?.param === 'customer') {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.name,
          metadata: { userId: user.id, barrierxUserId: user.barrierxUserId },
        });
        customerId = customer.id;
        await prisma.user.update({
          where: { id: userId },
          data: { stripeCustomerId: customerId },
        });
        session = await createSession(customerId);
      } else {
        throw e;
      }
    }

    res.json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Create checkout error:', errMsg, error);
    res.status(500).json({ error: 'Failed to create checkout session', message: errMsg });
  }
};

/**
 * POST /api/billing/webhook
 * Handles Stripe webhook events (checkout.session.completed, etc.)
 * Must receive the raw body for signature verification.
 */
export const handleWebhook = async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers['stripe-signature'] as string;

  let event: Stripe.Event;

  try {
    if (config.stripe.webhookSecret) {
      event = stripe.webhooks.constructEvent(req.body, sig, config.stripe.webhookSecret);
    } else {
      // In development without webhook secret, parse the event directly
      event = req.body as Stripe.Event;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Webhook signature verification failed:', msg);
    res.status(400).json({ error: `Webhook Error: ${msg}` });
    return;
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(subscription);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }
      default:
        console.log(`Unhandled webhook event: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
};

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const { userId, barrierxUserId, planId, interval } = session.metadata || {};

  if (!userId || !barrierxUserId || !planId) {
    console.error('Missing metadata in checkout session:', session.id);
    return;
  }

  const stripeSubscriptionId = session.subscription as string;
  const stripeCustomerId = session.customer as string;
  const plan = PRICE_MAP[planId];

  // Critical path first: mark user as onboarded + set plan.
  // This must succeed even if the subscription record write fails.
  await prisma.user.update({
    where: { id: userId },
    data: {
      onboardingCompleted: true,
      selectedPlan: planId,
      stripeCustomerId,
      role: 'ADMIN',
    },
  });

  // Store subscription record with Stripe IDs.
  // Period dates will be populated by the `customer.subscription.created` /
  // `customer.subscription.updated` events which reliably carry them.
  const existing = await prisma.subscription.findUnique({
    where: { barrierxUserId },
  });

  const subscriptionData = {
    planId,
    planName: plan?.name || planId,
    interval: (interval === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY') as 'MONTHLY' | 'ANNUAL',
    status: 'ACTIVE' as const,
    stripeSubscriptionId,
    stripeCustomerId,
  };

  if (existing) {
    await prisma.subscription.update({
      where: { id: existing.id },
      data: subscriptionData,
    });
  } else {
    await prisma.subscription.create({
      data: {
        barrierxUserId,
        ...subscriptionData,
        currency: 'usd',
      },
    });
  }

  console.log(`Checkout completed for user ${userId}, plan: ${planId}`);
}

function safeTimestamp(ts: unknown): Date | null {
  if (typeof ts === 'number' && ts > 0) {
    const d = new Date(ts * 1000);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

const STRIPE_STATUS_MAP: Record<string, string> = {
  active: 'ACTIVE',
  past_due: 'PAST_DUE',
  canceled: 'CANCELED',
  unpaid: 'UNPAID',
  trialing: 'TRIALING',
  incomplete: 'INCOMPLETE',
  incomplete_expired: 'INCOMPLETE_EXPIRED',
};

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const barrierxUserId = subscription.metadata?.barrierxUserId;
  if (!barrierxUserId) return;

  const existing = await prisma.subscription.findUnique({
    where: { barrierxUserId },
  });
  if (!existing) return;

  const firstItem = subscription.items.data[0];

  await prisma.subscription.update({
    where: { id: existing.id },
    data: {
      status: (STRIPE_STATUS_MAP[subscription.status] || 'ACTIVE') as any,
      stripePriceId: firstItem?.price.id || existing.stripePriceId,
      amount: firstItem?.price.unit_amount ?? existing.amount,
      currentPeriodStart: safeTimestamp(firstItem?.current_period_start) || existing.currentPeriodStart,
      currentPeriodEnd: safeTimestamp(firstItem?.current_period_end) || existing.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
    },
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const barrierxUserId = subscription.metadata?.barrierxUserId;
  if (!barrierxUserId) return;

  const existing = await prisma.subscription.findUnique({
    where: { barrierxUserId },
  });
  if (!existing) return;

  await prisma.subscription.update({
    where: { id: existing.id },
    data: {
      status: 'CANCELED',
      canceledAt: new Date(),
    },
  });
}

/**
 * GET /api/billing/checkout-status?session_id=xxx
 * Frontend calls this after Stripe redirects back to verify the session.
 */
export const getCheckoutStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { session_id } = req.query;
    if (!session_id || typeof session_id !== 'string') {
      res.status(400).json({ error: 'session_id is required' });
      return;
    }

    const session = await stripe.checkout.sessions.retrieve(session_id);

    res.json({
      success: true,
      status: session.payment_status,
      planId: session.metadata?.planId,
      interval: session.metadata?.interval,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Get checkout status error:', errMsg);
    res.status(500).json({ error: 'Failed to retrieve checkout status' });
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
