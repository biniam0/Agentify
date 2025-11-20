import { Router } from 'express';
import * as webhookController from '../controllers/webhookController';

const router = Router();

// ElevenLabs post-call webhook (receives transcript after call ends)
router.post('/elevenlabs', webhookController.handleElevenLabsWebhook);

// ElevenLabs Server Tools (called during the call)
router.post('/create-contact', webhookController.handleCreateContact);
router.post('/create-note', webhookController.handleCreateNote);
router.post('/create-meeting', webhookController.handleCreateMeeting);
router.post('/create-deal', webhookController.handleCreateDeal);

export default router;

