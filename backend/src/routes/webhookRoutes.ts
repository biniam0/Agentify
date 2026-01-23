import { Router } from 'express';
import * as webhookController from '../controllers/webhookController';

const router = Router();

// ElevenLabs post-call webhook (receives transcript after call ends)
router.post('/elevenlabs', webhookController.handleElevenLabsWebhook);

// Twilio inbound call personalization webhook
router.post('/twilio/personalization', webhookController.handleTwilioPersonalizationWebhook);

// ElevenLabs Server Tools (called during the call)
router.post('/create-contact', webhookController.handleCreateContact);
router.post('/create-note', webhookController.handleCreateNote);
router.post('/create-meeting', webhookController.handleCreateMeeting);
router.post('/create-task', webhookController.handleCreateTask);
router.post('/create-deal', webhookController.handleCreateDeal);

// Info Gathering Server Tools (unified agent with 3 tools)
// Called during the call to save gathered answers
router.post('/info-gathering/zero-score', webhookController.handleZeroScoreCallback);
router.post('/info-gathering/lost-deal', webhookController.handleLostDealCallback);
router.post('/info-gathering/inactivity', webhookController.handleInactivityCallback);

export default router;

