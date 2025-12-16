// Meeting service for triggering ElevenLabs calls
import axios from 'axios';
import { config } from '../config/env';
import { formatMeetingTime } from '../utils/riskGenerator';
import * as barrierxService from './barrierxService';
import { Contact } from './barrierxService';

/**
 * Get timezone offset string (e.g., "+03:00", "-05:00")
 */
function getTimezoneOffset(timezone: string, date: Date): string {
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  const offset = (tzDate.getTime() - utcDate.getTime()) / (1000 * 60);
  const hours = Math.floor(Math.abs(offset) / 60);
  const minutes = Math.abs(offset) % 60;
  const sign = offset >= 0 ? '+' : '-';
  return `${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

interface Deal {
  id: string;
  dealName: string;
  company: string;
  stage: string;
  amount: number;
  summary?: string;
  tenantSlug?: string;  // Tenant slug for webhook calls
  userDealRiskScores?: any;
  attachments?: Array<{ id: string; name?: string; url?: string }>;
}

interface Meeting {
  id: string;
  title: string;
  body: string;
  startTime: string;
  endTime: string;
}

interface User {
  userId: string;
  name: string;
  email: string;
  tenantSlug?: string;
}

interface Owner {
  id?: string;
  hubspotId?: string;  // HubSpot owner ID
  name: string;
  email?: string;
  phone: string;
  avatar?: string;
  timezone?: string;  // IANA timezone (e.g., "Africa/Addis_Ababa", "Europe/Madrid")
}

interface PreCallPayload {
  meetingData: Meeting;
  dealData: Deal & { owner?: Owner };
  userData: User;
  contacts: Contact[];
  tenantPhoneNumberId?: string;  // Tenant's ElevenLabs phone number ID
}

interface PostCallPayload {
  meetingData: Meeting;
  dealData: Deal & { owner?: Owner };
  userData: User;
  contacts: Contact[];
  tenantPhoneNumberId?: string;  // Tenant's ElevenLabs phone number ID
}

/**
 * Trigger pre-meeting call via ElevenLabs
 * Calls customer 15 minutes before meeting starts
 */
export const triggerPreMeetingCall = async (payload: PreCallPayload): Promise<any> => {
  try {
    const { meetingData, dealData, userData, contacts } = payload;

    // Get owner (sales rep) phone - NOT the customer
    const ownerPhone = dealData.owner?.phone;

    if (!ownerPhone) {
      console.log('       ⚠️  No owner phone number found, skipping call');
      return { success: false, error: 'No phone number' };
    }

    // Get customer contact for context/variables
    const customer = contacts && contacts.length > 0 ? contacts[0] : null;

    // Fetch risks and recommendations from BarrierX
    // Pass dealData to getRecommendations so it can use real recommendations if available
    const [risksData, recommendationsData] = await Promise.all([
      barrierxService.getRisks(dealData.id),
      barrierxService.getRecommendations(dealData.id, dealData as any),
    ]);

    const risks = risksData.risks || [];
    const recommendations = recommendationsData.recommendations || [];

    // Prepare dynamic variables for ElevenLabs
    const dynamicVariables = {
      // Meeting context
      customer_name: customer?.name || dealData.company || 'the prospect',
      company_name: dealData.company || 'their company',
      meeting_time: formatMeetingTime(meetingData.startTime),
      meeting_title: meetingData.title || 'Upcoming Meeting',

      // Deal context
      dealId: dealData.id,
      deal_name: dealData.dealName || 'Deal',
      deal_value: dealData.amount?.toString() || 'TBD',
      deal_stage: dealData.stage || 'early stage',
      deal_summary: dealData.summary || '',

      // Risk & Action recommendations
      risk_1: risks[0]?.description || 'No risks identified',
      risk_2: risks[1]?.description || '',
      risk_3: risks[2]?.description || '',
      recommended_actions: recommendations.length > 0 
        ? recommendations.map((rec, index) => `${index + 1}. ${rec.title}`).join('; ') 
        : 'No specific actions recommended at this time',
      action_count: recommendations.length,

      // Owner (sales rep) context
      owner_name: dealData.owner?.name || userData.name || 'Sales Rep',
      owner_email: dealData.owner?.email || userData.email || '',

      // ⭐ Required for note/meeting creation via webhook
      hubspot_owner_id: dealData.owner?.hubspotId || dealData.owner?.id || '',
      tenant_slug: dealData.tenantSlug || userData.tenantSlug || 'unknown',
    };

    // Debug log critical webhook values
    console.log('       📋 Webhook-Critical Values:');
    console.log(`          dealId: ${dynamicVariables.dealId}`);
    console.log(`          hubspot_owner_id: ${dynamicVariables.hubspot_owner_id}`);
    console.log(`          tenant_slug: ${dynamicVariables.tenant_slug}`);

    // Check if ElevenLabs is configured
    if (!config.elevenlabs.apiKey || !config.elevenlabs.preAgentId) {
      console.log('       ⚠️  ElevenLabs not configured, skipping actual API call');
      console.log('       📋 Would call:', ownerPhone);
      console.log('       📋 Variables:', JSON.stringify(dynamicVariables, null, 2));
      return { success: true, mock: true };
    }

    // Use ElevenLabs phone number ID from env
    const phoneNumberId = config.elevenlabs.phoneNumberId;

    if (!phoneNumberId) {
      console.log('       ⚠️  ELEVENLABS_PHONE_NUMBER_ID not configured in env, skipping PRE-CALL');
      return { success: false, error: 'No phone_number_id configured' };
    }

    // Make actual ElevenLabs API call
    const response = await axios.post(
      'https://api.elevenlabs.io/v1/convai/twilio/outbound-call',
      {
        agent_id: config.elevenlabs.preAgentId,
        agent_phone_number_id: phoneNumberId,
        to_number: ownerPhone,  // Call the OWNER (sales rep)
        conversation_initiation_client_data: {
          dynamic_variables: dynamicVariables,
        },
      },
      {
        headers: {
          'xi-api-key': config.elevenlabs.apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    // ElevenLabs returns conversation_id and callSid
    const conversationId = response.data.conversation_id;
    const callSid = response.data.callSid;

    if (!conversationId || !callSid) {
      console.log(`       ⚠️  ElevenLabs call may have failed - missing IDs`);
      console.log(`       📋 Full response:`, JSON.stringify(response.data, null, 2));
    } else {
      console.log(`       ✅ ElevenLabs PRE-CALL initiated successfully!`);
      console.log(`       📞 Calling: ${ownerPhone}`);
      console.log(`       📞 Conversation ID: ${conversationId}`);
      console.log(`       📞 Twilio Call SID: ${callSid}`);
    }

    return response.data;

  } catch (error: any) {
    console.error('       ❌ ElevenLabs API error:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Trigger post-meeting call via ElevenLabs
 * Calls customer 5 minutes after meeting ends
 */
export const triggerPostMeetingCall = async (payload: PostCallPayload): Promise<any> => {
  try {
    const { meetingData, dealData, userData, contacts } = payload;

    // Get owner (sales rep) phone - NOT the customer
    const ownerPhone = dealData.owner?.phone;

    if (!ownerPhone) {
      console.log('       ⚠️  No owner phone number found, skipping call');
      return { success: false, error: 'No phone number' };
    }

    // Get customer contact for context/variables
    const customer = contacts && contacts.length > 0 ? contacts[0] : null;

    // Get owner's timezone (default to UTC if not provided)
    const ownerTimezone = dealData.owner?.timezone || 'UTC';

    // Log warning if timezone is missing
    if (!dealData.owner?.timezone) {
      console.log(`       ⚠️  No timezone found for owner ${dealData.owner?.name}, defaulting to UTC`);
    }

    // Get current time in both UTC and owner's local timezone
    const now = new Date();
    const utcDateTime = now.toISOString();

    // Format current time in owner's timezone
    const ownerLocalDate = now.toLocaleDateString('en-US', {
      timeZone: ownerTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    const ownerLocalTime = now.toLocaleTimeString('en-US', {
      timeZone: ownerTimezone,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const ownerDayOfWeek = now.toLocaleDateString('en-US', {
      timeZone: ownerTimezone,
      weekday: 'long'
    });

    // Prepare dynamic variables for ElevenLabs (post-call needs meeting context)
    const dynamicVariables = {
      // Meeting context (just completed)
      customer_name: dealData.company || customer?.name || 'the prospect',
      meeting_title: meetingData.title || 'Recent Meeting',
      meeting_date: new Date(meetingData.startTime).toLocaleDateString(),
      meeting_time: new Date(meetingData.startTime).toLocaleTimeString(),
      meeting_attendees: contacts?.map(c => c.name || c.email).join(', ') || 'No attendees listed',

      // Deal context
      dealId: dealData.id,
      deal_id: dealData.id,
      deal_name: dealData.dealName || 'Deal',
      deal_stage: dealData.stage || 'Unknown',
      deal_amount: dealData.amount?.toString() || 'Not specified',
      deal_summary: dealData.summary || '',

      // Owner (sales rep) context
      owner_name: dealData.owner?.name || userData.name || 'Sales Rep',
      owner_email: dealData.owner?.email || userData.email || '',

      // ⭐ Required for note/meeting creation via webhook
      hubspot_owner_id: dealData.owner?.hubspotId || dealData.owner?.id || '',
      tenant_slug: dealData.tenantSlug || userData.tenantSlug || 'unknown',

      // 🌍 TIMEZONE-AWARE DATETIME VARIABLES for meeting scheduling
      current_datetime_utc: utcDateTime,
      current_date_local: ownerLocalDate,
      current_time_local: ownerLocalTime,
      current_day_of_week: ownerDayOfWeek,
      current_timezone: ownerTimezone,
      current_timezone_offset: getTimezoneOffset(ownerTimezone, now),
      current_timestamp_ms: now.getTime().toString(),
    };

    // Debug log critical webhook values
    console.log('       📋 Webhook-Critical Values:');
    console.log(`          dealId: ${dynamicVariables.dealId}`);
    console.log(`          hubspot_owner_id: ${dynamicVariables.hubspot_owner_id}`);
    console.log(`          tenant_slug: ${dynamicVariables.tenant_slug}`);
    console.log(`          timezone: ${dynamicVariables.current_timezone} (${dynamicVariables.current_timezone_offset})`);
    console.log(`          local_time: ${dynamicVariables.current_date_local} ${dynamicVariables.current_time_local}`);

    // Check if ElevenLabs is configured
    if (!config.elevenlabs.apiKey || !config.elevenlabs.postAgentId) {
      console.log('       ⚠️  ElevenLabs not configured, skipping actual API call');
      console.log('       📋 Would call:', ownerPhone);
      console.log('       📋 Variables:', JSON.stringify(dynamicVariables, null, 2));
      return { success: true, mock: true };
    }

    // Use ElevenLabs phone number ID from env
    const phoneNumberId = config.elevenlabs.phoneNumberId;

    if (!phoneNumberId) {
      console.log('       ⚠️  ELEVENLABS_PHONE_NUMBER_ID not configured in env, skipping POST-CALL');
      return { success: false, error: 'No phone_number_id configured' };
    }

    // Make actual ElevenLabs API call
    const response = await axios.post(
      'https://api.elevenlabs.io/v1/convai/twilio/outbound-call',
      {
        agent_id: config.elevenlabs.postAgentId,
        agent_phone_number_id: phoneNumberId,
        to_number: ownerPhone,  // Call the OWNER (sales rep), not customer
        conversation_initiation_client_data: {
          dynamic_variables: dynamicVariables,
        },
      },
      {
        headers: {
          'xi-api-key': config.elevenlabs.apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    // ElevenLabs returns conversation_id and callSid
    const conversationId = response.data.conversation_id;
    const callSid = response.data.callSid;

    if (!conversationId || !callSid) {
      console.log(`       ⚠️  ElevenLabs call may have failed - missing IDs`);
      console.log(`       📋 Full response:`, JSON.stringify(response.data, null, 2));
    } else {
      console.log(`       ✅ ElevenLabs POST-CALL initiated successfully!`);
      console.log(`       📞 Calling: ${ownerPhone}`);
      console.log(`       📞 Conversation ID: ${conversationId}`);
      console.log(`       📞 Twilio Call SID: ${callSid}`);
    }

    return response.data;

  } catch (error: any) {
    console.error('       ❌ ElevenLabs API error:', error.response?.data || error.message);
    throw error;
  }
};
