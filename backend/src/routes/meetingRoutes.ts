import { Router } from 'express';
import * as meetingController from '../controllers/meetingController';
import { authenticate } from '../middlewares/auth';

const router = Router();

// All meeting routes require authentication
router.use(authenticate);

router.get('/', meetingController.getMeetings);
router.post('/trigger/pre-call', meetingController.triggerPreMeetingCall);
router.post('/trigger/post-call', meetingController.triggerPostMeetingCall);

export default router;

