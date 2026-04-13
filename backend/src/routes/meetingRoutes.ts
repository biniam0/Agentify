import { Router } from 'express';
import * as meetingController from '../controllers/meetingController';
import { authenticate } from '../middlewares/auth';
import { requireSuperAdmin } from '../middlewares/adminAuth';

const router = Router();

// All meeting routes require authentication
router.use(authenticate);

router.get('/', meetingController.getMeetings);
router.post('/trigger/pre-call', meetingController.triggerPreMeetingCall);
router.post('/trigger/post-call', meetingController.triggerPostMeetingCall);

// Super-admin-only endpoints
router.get('/admin', requireSuperAdmin, meetingController.getAdminMeetings);
router.post('/admin/trigger/pre-call', requireSuperAdmin, meetingController.adminTriggerPreMeetingCall);
router.post('/admin/trigger/post-call', requireSuperAdmin, meetingController.adminTriggerPostMeetingCall);

export default router;

