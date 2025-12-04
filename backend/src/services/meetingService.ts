// Meeting service for triggering ElevenLabs calls
import axios from 'axios';
import { config } from '../config/env';
import { formatMeetingTime } from '../utils/riskGenerator';
import * as barrierxService from './barrierxService';
import { Contact } from './barrierxService';

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

    // Fetch risks and recommendations from BarrierX (mock for now)
    const [risksData, recommendationsData] = await Promise.all([
      barrierxService.getRisks(dealData.id),
      barrierxService.getRecommendations(dealData.id),
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
      action_1: recommendations[0]?.note || 'Proceed with standard process',
      action_2: recommendations[1]?.note || '',
      action_3: recommendations[2]?.note || '',

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
    };

    // Debug log critical webhook values
    console.log('       📋 Webhook-Critical Values:');
    console.log(`          dealId: ${dynamicVariables.dealId}`);
    console.log(`          hubspot_owner_id: ${dynamicVariables.hubspot_owner_id}`);
    console.log(`          tenant_slug: ${dynamicVariables.tenant_slug}`);

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
