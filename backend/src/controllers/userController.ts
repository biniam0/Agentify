import { Response } from 'express';
import axios from 'axios';
import { AuthRequest } from '../middlewares/auth';
import prisma from '../config/database';
import { invalidateUserCache } from '../utils/userCache';
import { config } from '../config/env';

export const toggleEnabled = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { isEnabled } = req.body;

    if (typeof isEnabled !== 'boolean') {
      res.status(400).json({ error: 'isEnabled must be a boolean value' });
      return;
    }

    // Update user in database
    const user = await prisma.user.update({
      where: { id: userId },
      data: { isEnabled },
    });

    // ⚡ Invalidate cache after update
    invalidateUserCache(userId);

    console.log(`✅ User ${user.email} automation ${isEnabled ? 'ENABLED' : 'DISABLED'}`);

    res.json({
      success: true,
      isEnabled: user.isEnabled,
      message: `Automation ${isEnabled ? 'enabled' : 'disabled'} successfully`,
    });
  } catch (error) {
    console.error('Toggle enabled error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
};

export const getCurrentUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isAuth: true,
        isEnabled: true,
        onboardingCompleted: true,
        selectedPlan: true,
        stripeCustomerId: true,
        tenantSlug: true,
        barrierxUserId: true,
        hubspotOwnerId: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
};

// Returns the profile fields used by the Settings > Personal Information form.
export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        country: true,
        gender: true,
        avatarUrl: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Backfill first/last from legacy `name` so the UI always has values to display.
    let firstName = user.firstName;
    let lastName = user.lastName;
    if (!firstName && !lastName && user.name) {
      const parts = user.name.trim().split(/\s+/);
      firstName = parts[0] ?? null;
      lastName = parts.slice(1).join(' ') || null;
    }

    res.json({
      success: true,
      profile: {
        id: user.id,
        email: user.email,
        firstName: firstName ?? '',
        lastName: lastName ?? '',
        phone: user.phone ?? '',
        country: user.country ?? '',
        gender: user.gender ?? null,
        avatarUrl: user.avatarUrl ?? null,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
};

const ALLOWED_GENDERS = ['MALE', 'FEMALE'] as const;
type GenderValue = (typeof ALLOWED_GENDERS)[number];

const isGender = (value: unknown): value is GenderValue =>
  typeof value === 'string' && (ALLOWED_GENDERS as readonly string[]).includes(value);

// Updates the user's profile fields from the Settings > Personal Information form.
export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { firstName, lastName, phone, country, gender, avatarUrl } = req.body ?? {};

    const data: Record<string, unknown> = {};

    if (firstName !== undefined) data.firstName = String(firstName).trim() || null;
    if (lastName !== undefined) data.lastName = String(lastName).trim() || null;
    if (phone !== undefined) data.phone = String(phone).trim() || null;
    if (country !== undefined) data.country = String(country).trim() || null;
    if (avatarUrl !== undefined) data.avatarUrl = String(avatarUrl).trim() || null;

    if (gender !== undefined) {
      if (gender === null || gender === '') {
        data.gender = null;
      } else if (isGender(gender)) {
        data.gender = gender;
      } else {
        res.status(400).json({ error: 'Invalid gender value' });
        return;
      }
    }

    // Keep the legacy `name` column in sync so other systems relying on it stay consistent.
    // Use `in` (not `??`) so an explicit clear (null) is preserved instead of falling
    // back to the existing value — otherwise users can't clear just one half of their name.
    if (firstName !== undefined || lastName !== undefined) {
      const existing = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });
      const nextFirst = 'firstName' in data
        ? (data.firstName as string | null)
        : (existing?.firstName ?? null);
      const nextLast = 'lastName' in data
        ? (data.lastName as string | null)
        : (existing?.lastName ?? null);
      const joined = `${nextFirst ?? ''} ${nextLast ?? ''}`.trim();
      // `User.name` is non-nullable, so only overwrite when we actually have a value.
      if (joined) data.name = joined;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        country: true,
        gender: true,
        avatarUrl: true,
      },
    });

    invalidateUserCache(userId);

    res.json({
      success: true,
      profile: {
        id: updated.id,
        email: updated.email,
        firstName: updated.firstName ?? '',
        lastName: updated.lastName ?? '',
        phone: updated.phone ?? '',
        country: updated.country ?? '',
        gender: updated.gender ?? null,
        avatarUrl: updated.avatarUrl ?? null,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

export const getTenantMembers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { tenantSlug: true },
    });

    if (!user?.tenantSlug) {
      res.status(404).json({ error: 'Tenant not found for this user' });
      return;
    }

    const response = await axios.get(
      `${config.barrierx.baseUrl}/api/external/tenants/${user.tenantSlug}/members`,
      {
        headers: {
          'Authorization': `Bearer ${config.barrierx.apiKey}`,
          'Accept': 'application/json',
        },
        timeout: 15000,
      }
    );

    if (!response.data.ok) {
      res.status(502).json({ error: 'Failed to fetch members from BarrierX' });
      return;
    }

    res.json({
      success: true,
      tenant: user.tenantSlug,
      tenantName: response.data.tenantName,
      count: response.data.count,
      members: response.data.members,
    });
  } catch (error: any) {
    console.error('Get tenant members error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch tenant members' });
  }
};

type InviteRole = 'READ_ONLY' | 'EDITOR' | 'ADMIN';

const roleMap: Record<InviteRole, string> = {
  'READ_ONLY': 'read_only',
  'EDITOR': 'editor',
  'ADMIN': 'admin',
};

export const inviteTenantMembers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { invites } = req.body;

    if (!Array.isArray(invites) || invites.length === 0) {
      res.status(400).json({ error: 'invites array is required and must not be empty' });
      return;
    }

    for (const invite of invites) {
      if (!invite.email || typeof invite.email !== 'string') {
        res.status(400).json({ error: 'Each invite must have a valid email' });
        return;
      }
      if (!invite.role || typeof invite.role !== 'string') {
        res.status(400).json({ error: 'Each invite must have a valid role' });
        return;
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { tenantSlug: true },
    });

    if (!user?.tenantSlug) {
      res.status(404).json({ error: 'Tenant not found for this user' });
      return;
    }

    const transformedInvites = invites.map((invite) => ({
      email: invite.email,
      role: roleMap[invite.role as InviteRole] || invite.role.toLowerCase(),
    }));

    let response;
    let usedExternalPath = true;

    try {
      response = await axios.post(
        `${config.barrierx.baseUrl}/api/external/tenants/${user.tenantSlug}/invite`,
        { invites: transformedInvites },
        {
          headers: {
            'Authorization': `Bearer ${config.barrierx.apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          timeout: 15000,
        }
      );
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log('External invite endpoint not found, trying non-external path...');
        usedExternalPath = false;

        response = await axios.post(
          `${config.barrierx.baseUrl}/api/tenants/${user.tenantSlug}/invite`,
          { invites: transformedInvites },
          {
            headers: {
              'Authorization': `Bearer ${config.barrierx.apiKey}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            timeout: 15000,
          }
        );
      } else {
        throw error;
      }
    }

    if (!response.data || response.data.ok === false) {
      res.status(502).json({ 
        error: response.data?.error || 'Failed to send invites through BarrierX' 
      });
      return;
    }

    console.log(`✅ Sent ${invites.length} invite(s) to tenant ${user.tenantSlug} via ${usedExternalPath ? 'external' : 'standard'} path`);

    res.json({
      success: true,
      message: `Successfully sent ${invites.length} invitation${invites.length === 1 ? '' : 's'}`,
      count: invites.length,
    });
  } catch (error: any) {
    console.error('Invite tenant members error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: error.response?.data?.error || 'Failed to send invitations' 
    });
  }
};

export const resyncHubSpot = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { tenantSlug: true },
    });

    if (!user?.tenantSlug) {
      res.status(404).json({ error: 'Tenant not found for this user' });
      return;
    }

    console.log(`🔄 Triggering HubSpot resync for tenant: ${user.tenantSlug}`);

    const response = await axios.post(
      `${config.barrierx.baseUrl}/api/external/tenants/${user.tenantSlug}/hubspot/resync`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${config.barrierx.apiKey}`,
          'Accept': 'application/json',
        },
        timeout: 15000,
      }
    );

    if (!response.data || response.data.ok === false) {
      res.status(502).json({ 
        error: response.data?.error || 'Failed to start HubSpot resync' 
      });
      return;
    }

    console.log(`✅ HubSpot resync started for tenant ${user.tenantSlug}`);

    res.json({
      success: true,
      message: response.data.message || 'Full HubSpot resync started',
    });
  } catch (error: any) {
    console.error('HubSpot resync error:', error.response?.data || error.message);
    
    const status = error.response?.status;
    const errorMsg = error.response?.data?.error || error.message;

    if (status === 401) {
      res.status(401).json({ error: 'Not authorized. Please reconnect HubSpot.' });
    } else if (status === 404) {
      res.status(404).json({ error: 'HubSpot integration not found. Please connect first.' });
    } else {
      res.status(500).json({ error: errorMsg || 'Failed to start HubSpot resync. Please try again later.' });
    }
  }
};

