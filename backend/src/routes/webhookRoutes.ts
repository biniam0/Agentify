import { Router } from 'express';
import * as webhookController from '../controllers/webhookController';

const router = Router();

router.post('/elevenlabs', webhookController.handleElevenLabsWebhook);

export default router;

