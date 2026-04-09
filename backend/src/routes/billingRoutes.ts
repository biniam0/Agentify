import { Router } from 'express';
import express from 'express';
import { authenticate } from '../middlewares/auth';
import * as billingController from '../controllers/billingController';

const router = Router();

router.post('/create-checkout', authenticate, billingController.createCheckout);
router.get('/checkout-status', authenticate, billingController.getCheckoutStatus);
router.get('/subscription', authenticate, billingController.getSubscription);
router.post('/onboarding', authenticate, billingController.saveOnboardingProfile);

// Stripe webhook needs raw body for signature verification — NOT JSON parsed
router.post('/webhook', express.raw({ type: 'application/json' }), billingController.handleWebhook);

export default router;
