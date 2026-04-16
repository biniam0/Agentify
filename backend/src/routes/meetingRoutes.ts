import { Router } from 'express';
import * as meetingController from '../controllers/meetingController';
import { authenticate } from '../middlewares/auth';
import { requireAdmin } from '../middlewares/adminAuth';

const router = Router();

// All meeting routes require authentication
router.use(authenticate);

router.get('/', meetingController.getMeetings);
router.post('/trigger/pre-call', meetingController.triggerPreMeetingCall);
router.post('/trigger/post-call', meetingController.triggerPostMeetingCall);

// Tenant-scoped endpoints (V2 dashboard, ADMIN or SUPER_ADMIN)
router.get('/tenant', requireAdmin, meetingController.getTenantMeetings);

// Admin endpoints (ADMIN or SUPER_ADMIN)
router.get('/admin', requireAdmin, meetingController.getAdminMeetings);
router.post('/admin/trigger/pre-call', requireAdmin, meetingController.adminTriggerPreMeetingCall);
router.post('/admin/trigger/post-call', requireAdmin, meetingController.adminTriggerPostMeetingCall);

export default router;

