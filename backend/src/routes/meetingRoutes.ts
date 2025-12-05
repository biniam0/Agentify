import { Router } from 'express';
import * as meetingController from '../controllers/meetingController';
import { authenticate } from '../middlewares/auth';

const router = Router();

// All meeting routes require authentication
router.use(authenticate);

router.get('/', meetingController.getMeetings);
router.get('/admin', meetingController.getAdminMeetings);
router.post('/trigger/pre-call', meetingController.triggerPreMeetingCall);
router.post('/trigger/post-call', meetingController.triggerPostMeetingCall);

// Admin-only trigger endpoints
router.post('/admin/trigger/pre-call', meetingController.adminTriggerPreMeetingCall);
router.post('/admin/trigger/post-call', meetingController.adminTriggerPostMeetingCall);

export default router;

