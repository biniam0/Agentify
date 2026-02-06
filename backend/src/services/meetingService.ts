// Meeting service for triggering ElevenLabs calls
import axios from 'axios';
import { config } from '../config/env';
import { formatMeetingTime } from '../utils/riskGenerator';
import * as barrierxService from './barrierxService';
import { Contact } from './barrierxService';

// ============================================
// CONSTANTS
// ============================================

const MAX_RECOMMENDATIONS = 10;

// Severity order for sorting (lower index = higher priority)
const SEVERITY_ORDER: Record<string, number> = {
  'Critical': 0,
  'High': 1,
  'Mid': 2,
  'Medium': 2, // Handle both 'Mid' and 'Medium'
};

// Mock data for when no real data is available
const MOCK_RISKS = [
  {
    title: 'Confirm Decision Timeline and Next Steps',
    risk: 'Decision timeline and approval process are unclear. Without understanding the decision-making chain, the deal may stall unexpectedly or miss critical approval windows.',
    severity: 'High',
  },
  {
    title: 'Identify Key Stakeholders and Their Concerns',
    risk: 'Key stakeholders and their influence on the decision are not fully mapped. Unknown blockers or missing champions could derail the deal at a critical stage.',
    severity: 'High',
  },
  {
    title: 'Validate Budget Availability and Approval Process',
    risk: 'Budget availability and approval process are not confirmed. The deal could be delayed or lost if budget is not secured or competes with other priorities.',
    severity: 'High',
  },
  {
    title: 'Clarify Success Criteria and Expected Outcomes',
    risk: 'Success criteria and expected outcomes are not clearly defined. Misalignment on expectations could lead to dissatisfaction or scope disputes post-sale.',
    severity: 'Medium',
  },
  {
    title: 'Document Any Objections or Potential Blockers',
    risk: 'Potential objections or blockers have not been surfaced. Unaddressed concerns could emerge late in the sales cycle and delay or prevent closing.',
    severity: 'Medium',
  },
];

const MOCK_ACTIONS = [
  {
    title: 'Confirm Decision Timeline and Next Steps',
    note: 'Ask the prospect to walk you through their decision-making process, including who needs to approve, what criteria they will use, and their target timeline for making a decision. Document this clearly.',
    severity: 'High',
  },
  {
    title: 'Identify Key Stakeholders and Their Concerns',
    note: 'Identify all stakeholders involved in this decision. Understand each person\'s role, their primary concerns, and what success looks like for them individually. Map out any potential blockers or champions.',
    severity: 'High',
  },
  {
    title: 'Validate Budget Availability and Approval Process',
    note: 'Confirm whether budget has been allocated for this initiative. Ask about the approval process, any competing priorities for the budget, and whether there are timing considerations around fiscal periods.',
    severity: 'High',
  },
  {
    title: 'Clarify Success Criteria and Expected Outcomes',
    note: 'Ask the prospect to define what a successful outcome looks like for them. Understand the specific metrics or results they expect, and ensure your solution can deliver on these expectations.',
    severity: 'Medium',
  },
  {
    title: 'Document Any Objections or Potential Blockers',
    note: 'Proactively ask about any concerns, hesitations, or potential obstacles that could delay or prevent this deal from moving forward. Address these openly and document any unresolved issues.',
    severity: 'Medium',
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

interface Recommendation {
  note: string;
  risk: string;
  title: string;
  severity: string;
  isAssigned: boolean;
  indicatorId: string;
  isCompleted: boolean;
}

/**
 * Get risk text with fallback chain: risk -> note -> title
 * Never returns "No details available"
 */
function getRiskText(rec: Recommendation): string {
  const risk = (rec.risk || '').trim();
  if (risk && risk !== 'No details available') return risk;
  
  const note = (rec.note || '').trim();
  if (note) return note;
  
  return rec.title || 'Risk details pending';
}

/**
 * Check if a recommendation has real risk content
 */
function hasRealRiskContent(rec: Recommendation): boolean {
  const risk = (rec.risk || '').trim();
  return risk.length > 0 && risk !== 'No details available';
}

/**
 * Process recommendations: filter completed, sort by severity, limit to max
 */
function processRecommendations(recommendations: Recommendation[]): {
  activeRecs: Recommendation[];
  hasAnyRealRisk: boolean;
} {
  // Filter out completed recommendations
  const activeRecs = recommendations
    .filter(rec => !rec.isCompleted)
    // Sort by severity (Critical -> High -> Mid/Medium -> Unknown)
    .sort((a, b) => {
      const aIdx = SEVERITY_ORDER[a.severity] ?? 3;
      const bIdx = SEVERITY_ORDER[b.severity] ?? 3;
      return aIdx - bIdx;
    })
    // Limit to max
    .slice(0, MAX_RECOMMENDATIONS);

  // Check if any recommendation has real risk content
  const hasAnyRealRisk = activeRecs.some(hasRealRiskContent);

  return { activeRecs, hasAnyRealRisk };
}

/**
 * Build risks string for agent
 */
function buildRisksString(recs: Recommendation[], useMock: boolean): string {
  if (useMock) {
    return MOCK_RISKS.map((r, i) => `Risk ${i + 1}: ${r.risk}`).join('\n\n');
  }
  return recs.map((rec, i) => `Risk ${i + 1}: ${getRiskText(rec)}`).join('\n\n');
}

/**
 * Build full risks string for agent (with severity and title)
 */
function buildRisksFullString(recs: Recommendation[], useMock: boolean): string {
  if (useMock) {
    return MOCK_RISKS.map((r, i) => 
      `Risk ${i + 1} [${r.severity}]: ${r.title}\nDetails: ${r.risk}`
    ).join('\n\n');
  }
  return recs.map((rec, i) => 
    `Risk ${i + 1} [${rec.severity}]: ${rec.title}\nDetails: ${getRiskText(rec)}`
  ).join('\n\n');
}

/**
 * Build actions string for agent
 */
function buildActionsString(recs: Recommendation[], useMock: boolean): string {
  if (useMock) {
    return MOCK_ACTIONS.map((r, i) => `${i + 1}. ${r.title}`).join('; ');
  }
  return recs.map((rec, i) => `${i + 1}. ${rec.title}`).join('; ');
}

/**
 * Build full recommendations string for agent (with context)
 */
function buildRecommendationsFullString(recs: Recommendation[], useMock: boolean): string {
  if (useMock) {
    return MOCK_ACTIONS.map((r, i) => 
      `Action ${i + 1} [${r.severity}]: ${r.title}\nContext: ${r.note}`
    ).join('\n\n');
  }
  return recs.map((rec, i) => 
    `Action ${i + 1} [${rec.severity}]: ${rec.title}\nContext: ${rec.note || 'No additional context available'}`
  ).join('\n\n');
}

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
  recommendations?: Array<{
    note: string;
    risk: string;
    title: string;
    severity: string;
    isAssigned: boolean;
    indicatorId: string;
    isCompleted: boolean;
  }>;
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
 * Calls customer 20 minutes before meeting starts
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

    // Fetch recommendations from BarrierX (risks are now extracted from recommendation.risk field)
    const recommendationsData = await barrierxService.getRecommendations(dealData.id, dealData as any);
    const recommendations = recommendationsData.recommendations || [];

    // Process recommendations: filter completed, sort by severity, limit to max 10
    const { activeRecs, hasAnyRealRisk } = processRecommendations(recommendations);

    // Determine what data to use:
    // - Recommendations: use real if any active, else mock
    // - Risks: use real if any have content, else mock
    const useRealRecommendations = activeRecs.length > 0;
    const useRealRisks = useRealRecommendations && hasAnyRealRisk;
    const useMockForRecommendations = !useRealRecommendations || recommendationsData.isUsingMockData;
    const useMockForRisks = !useRealRisks;

    // Log processing results
    console.log(`       📊 Recommendations processed:`);
    console.log(`          Total: ${recommendations.length}, Active: ${activeRecs.length}`);
    console.log(`          Has real risks: ${hasAnyRealRisk}`);
    console.log(`          Using mock recommendations: ${useMockForRecommendations}`);
    console.log(`          Using mock risks: ${useMockForRisks}`);

    // Build dynamic variables
    const risksData = useMockForRisks ? MOCK_RISKS : activeRecs;
    const actionsData = useMockForRecommendations ? MOCK_ACTIONS : activeRecs;

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

      // Risks (extracted from recommendation.risk field, sorted by severity)
      // Agent should summarize these for briefing as they can be lengthy
      risks: buildRisksString(activeRecs, useMockForRisks),
      risks_full: buildRisksFullString(activeRecs, useMockForRisks),
      risk_count: risksData.length,

      // Recommended actions (sorted by severity)
      recommended_actions: buildActionsString(activeRecs, useMockForRecommendations),
      action_count: actionsData.length,

      // Full context with notes for detailed discussion
      recommendations_full: buildRecommendationsFullString(activeRecs, useMockForRecommendations),

      // Flag to indicate if using general/mock data (not deal-specific from BarrierX)
      using_mock: useMockForRecommendations,
      using_mock_risks: useMockForRisks,

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
      return { success: false, error: 'ElevenLabs not configured' };
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

    // Return response data + the dynamicVariables we created
    // This allows scheduler/controller to save them to CallLog
    return {
      ...response.data,
      dynamicVariables: dynamicVariables,
    };

  } catch (error: any) {
    console.error('       ❌ ElevenLabs API error:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Trigger post-meeting call via ElevenLabs
 * Calls customer 18 minutes after meeting ends (15-21 min window)
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
      return { success: false, error: 'ElevenLabs not configured' };
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

    // Return response data + the dynamicVariables we created
    // This allows scheduler/controller to save them to CallLog
    return {
      ...response.data,
      dynamicVariables: dynamicVariables,
    };

  } catch (error: any) {
    console.error('       ❌ ElevenLabs API error:', error.response?.data || error.message);
    throw error;
  }
};
