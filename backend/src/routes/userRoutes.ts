import { Router } from 'express';
import * as userController from '../controllers/userController';
import * as socialLinksController from '../controllers/socialLinksController';
import * as integrationsController from '../controllers/integrationsController';
import { authenticate } from '../middlewares/auth';

const router = Router();

// All user routes require authentication
router.use(authenticate);

// Get current user info
router.get('/me', userController.getCurrentUser);

// Toggle automation enabled/disabled
router.patch('/toggle-enabled', userController.toggleEnabled);

// Get tenant members from BarrierX
router.get('/tenant-members', userController.getTenantMembers);

// Invite team members to tenant
router.post('/tenant-invites', userController.inviteTenantMembers);

// Resync HubSpot data for tenant
router.post('/hubspot/resync', userController.resyncHubSpot);

// Settings > Personal Information
router.get('/profile', userController.getProfile);
router.patch('/profile', userController.updateProfile);

// Settings > Social URLs
router.get('/social-links', socialLinksController.listSocialLinks);
router.put('/social-links', socialLinksController.replaceSocialLinks);

// Settings > Connect Accounts
router.get('/integrations', integrationsController.listIntegrations);
router.post('/integrations/:provider/connect', integrationsController.connectIntegration);
router.post('/integrations/:provider/disconnect', integrationsController.disconnectIntegration);

export default router;

