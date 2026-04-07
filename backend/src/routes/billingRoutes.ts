import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import * as billingController from '../controllers/billingController';

const router = Router();

router.post('/create-checkout', authenticate, billingController.createCheckout);
router.post('/verify-payment', authenticate, billingController.verifyPayment);
router.post('/confirm-payment', authenticate, billingController.confirmPayment);
router.get('/subscription', authenticate, billingController.getSubscription);
router.post('/onboarding', authenticate, billingController.saveOnboardingProfile);

export default router;
