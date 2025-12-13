import { Request, Response } from 'express';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import * as barrierxService from '../services/barrierxService';
import { config } from '../config/env';
import { verifyElevenLabsSignature } from '../utils/webhookVerification';
import { CLIENT_RENEG_LIMIT } from 'tls';
import { handleCallInitiationFailure, markCallAsSuccessful } from '../services/callRetryService';
import * as loggingService from '../services/loggingService';

export const handleElevenLabsWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('\n📞 Received ElevenLabs webhook');
    console.log('⏰ Time:', new Date().toISOString());

    // Signature verification DISABLED for testing
    // TODO: Re-enable when ready for production
    // const signature = (req.headers['elevenlabs-signature'] || 
    //   req.headers['Elevenlabs-Signature']) as string;
    // const isValid = verifyElevenLabsSignature(
    //   signature,
    //   req.body,
    //   config.elevenlabs.webhookSecret
    // );
    // if (!isValid) {
    //   console.log('❌ Webhook signature verification failed');
    //   res.status(401).json({ error: 'Invalid signature' });
    //   return;
    // }

    const { type, event_timestamp, data } = req.body;

    // Handle call initiation failures (for retry logic)
    // ElevenLabs sends 'call_initiation_failure' (without trailing 'd')
    if (type === 'call_initiation_failure') {
      console.log(`\n📞 Call initiation FAILED webhook received`);
      console.log(`   ❌ Failure Reason: ${data?.failure_reason || 'Unknown'}`);
      console.log(`   📞 Phone: ${data?.metadata?.phone_call?.external_number || data?.phone_number || 'Unknown'}`);
      console.log(`   🤖 Agent ID: ${data?.agent_id}`);
      console.log(`   📋 Webhook structure - Type: ${type}, Has data: ${!!data}, Has metadata: ${!!data?.metadata}`);

      // Save failure webhook for debugging
      try {
        const filePath = join(__dirname, '../../webhooks', 'elevenlabs-call-failure-latest.json');
        await writeFile(filePath, JSON.stringify(req.body, null, 2), 'utf-8');
        console.log(`   💾 Failure webhook saved to: elevenlabs-call-failure-latest.json`);
      } catch (saveError) {
        console.error('   ⚠️  Failed to save failure webhook:', saveError);
      }

      // Process retry logic (only retries on "no-answer")
      await handleCallInitiationFailure(req.body);

      // Log the webhook
      await loggingService.logWebhook({
        webhookType: 'ELEVENLABS_CALL',
        eventType: 'call_initiation_failure',
        agentId: data?.agent_id,
        status: 'SUCCESS',
        payload: req.body,
      });

      // Update call log with failure
      const phoneNumber = data?.metadata?.phone_call?.external_number;
      if (phoneNumber && data?.agent_id) {
        // Try to find and update the call log by phone + agent
        // Note: We might not have conversationId for failed calls
        await loggingService.logActivity({
          activityType: 'WEBHOOK_RECEIVED',
          status: 'SUCCESS',
          metadata: {
            webhookType: 'call_initiation_failure',
            failureReason: data?.failure_reason,
            phoneNumber,
          },
        });
      }

      res.status(200).json({
        received: true,
        type: 'call_initiation_failure',
        failure_reason: data?.failure_reason,
        retry_enabled: config.callRetry.enabled,
      });
      return;
    }

    if (!data) {
      res.status(400).json({ error: 'Invalid webhook payload' });
      return;
    }

    // Extract key information from webhook
    const conversationId = data.conversation_id;
    const agentId = data.agent_id;
    const status = data.status;

    // Determine if this is pre-meeting or post-meeting call
    const isPreMeetingCall = agentId === config.elevenlabs.preAgentId;
    const isPostMeetingCall = agentId === config.elevenlabs.postAgentId;
    const callType = isPreMeetingCall ? 'PRE-MEETING' : isPostMeetingCall ? 'POST-MEETING' : 'UNKNOWN';

    console.log(`📋 Type: ${type}`);
    console.log(`📋 Call Type: ${callType} 🎯`);
    console.log(`📋 Conversation ID: ${conversationId}`);
    console.log(`📋 Agent ID: ${agentId}`);
    console.log(`📋 Status: ${status}`);

    // Save webhook payload to file (overwrite if exists)
    try {
      const fileName = isPreMeetingCall
        ? 'elevenlabs-pre-call-latest.json'
        : isPostMeetingCall
          ? 'elevenlabs-post-call-latest.json'
          : 'elevenlabs-unknown-call-latest.json';

      const filePath = join(__dirname, '../../webhooks', fileName);
      await writeFile(filePath, JSON.stringify(req.body, null, 2), 'utf-8');
      console.log(`💾 Webhook payload saved to: ${fileName}`);
    } catch (saveError) {
      console.error('⚠️  Failed to save webhook payload:', saveError);
      // Continue processing even if save fails
    }

    // Extract metadata
    const metadata = data.metadata || {};
    const callDuration = metadata.call_duration_secs || 0;
    const terminationReason = metadata.termination_reason || 'Unknown';
    const phoneCall = metadata.phone_call || {};
    const calledNumber = phoneCall.external_number || 'Unknown';

    console.log(`📞 Called Number: ${calledNumber}`);
    console.log(`⏱️  Duration: ${callDuration} seconds`);
    console.log(`🔚 Termination: ${terminationReason}`);

    // Extract analysis
    const analysis = data.analysis || {};
    const callSuccessful = analysis.call_successful || 'unknown';
    const transcriptSummary = analysis.transcript_summary || 'No summary available';
    const callSummaryTitle = analysis.call_summary_title || 'Call Summary';

    console.log(`✅ Call Success: ${callSuccessful}`);
    console.log(`📝 Summary: ${transcriptSummary.substring(0, 100)}...`);

    // Extract dynamic variables (contains dealId and other context)
    const dynamicVariables = data.conversation_initiation_client_data?.dynamic_variables || {};
    const dealId = dynamicVariables.dealId || dynamicVariables.deal_id;
    const customerName = dynamicVariables.customer_name;
    const tenantSlug = dynamicVariables.tenant_slug;
    const hubspotOwnerId = dynamicVariables.hubspot_owner_id;

    console.log(`💼 Deal ID: ${dealId}`);
    console.log(`👤 Customer: ${customerName}`);
    console.log(`🏢 Tenant Slug: ${tenantSlug}`);
    console.log(`👤 Owner ID: ${hubspotOwnerId}`);

    // Extract full transcript
    const transcript = data.transcript || [];
    const fullTranscript = transcript.map((entry: any) =>
      `${entry.role}: ${entry.message}`
    ).join('\n');

    // Create note in HubSpot via BarrierX
    if (dealId && tenantSlug && hubspotOwnerId) {
      console.log('\n📝 Creating note in HubSpot via BarrierX...');

      const noteContent = `
=== ${callType} Call Summary ===
Title: ${callSummaryTitle}
Call Status: ${callSuccessful}
Duration: ${callDuration} seconds

Summary:
${transcriptSummary}

Conversation ID: ${conversationId}
Timestamp: ${new Date(event_timestamp * 1000).toISOString()}
      `.trim();

      const noteResult = await barrierxService.createNoteEngagement({
        tenantSlug: tenantSlug,
        dealId: dealId,
        ownerId: hubspotOwnerId,
        body: noteContent,
        timestamp: event_timestamp * 1000,
      });

      if (noteResult.success) {
        console.log(`✅ Note created successfully! Engagement ID: ${noteResult.engagementId}`);
      } else {
        console.error(`❌ Failed to create note: ${noteResult.error}`);
      }
    } else {
      console.log('⚠️  Missing required fields for note creation:');
      console.log(`   Deal ID: ${dealId || 'MISSING'}`);
      console.log(`   Tenant Slug: ${tenantSlug || 'MISSING'}`);
      console.log(`   Owner ID: ${hubspotOwnerId || 'MISSING'}`);
    }

    // Optional: Create contact if new contact info is detected
    // Optional: Update deal if needed

    // Mark call as successful to clear any pending retries
    if (calledNumber && agentId && type === 'conversation.ended') {
      markCallAsSuccessful(calledNumber, agentId);
    }

    // Log the webhook
    await loggingService.logWebhook({
      webhookType: 'ELEVENLABS_CALL',
      eventType: type,
      conversationId: conversationId,
      agentId: agentId,
      status: 'SUCCESS',
      payload: req.body,
    });

    // Update call log with completion data
    if (conversationId) {
      await loggingService.updateCallLog(conversationId, {
        status: 'COMPLETED',
        completedAt: new Date(event_timestamp * 1000),
        duration: callDuration,
        callSuccessful: callSuccessful === 'true',
        transcriptSummary: transcriptSummary,
        webhookData: req.body,
      });
    }

    // Log note creation as CRM action
    if (dealId && tenantSlug && hubspotOwnerId) {
      await loggingService.logCrmAction({
        actionType: 'NOTE',
        conversationId: conversationId,
        dealId: dealId,
        tenantSlug: tenantSlug,
        ownerId: hubspotOwnerId,
        title: callSummaryTitle,
        body: transcriptSummary,
        status: 'SUCCESS',
      });
    }

    console.log('✅ Webhook processed successfully\n');

    res.json({
      success: true,
      message: 'Webhook processed successfully',
      callType,
      conversationId,
      dealId,
      noteCreated: !!dealId,
    });

  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    res.status(500).json({
      error: 'Failed to process webhook',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const handleCreateContact = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('\n📇 Received create_contact command from ElevenLabs');
    console.log('⏰ Time:', new Date().toISOString());
    console.log('📋 Contact Data:', JSON.stringify(req.body, null, 2));

    const { name, title, company, email, phone } = req.body;

    console.log('\n📊 Extracted Fields:');
    console.log(`  Name: ${name || 'Not provided'}`);
    console.log(`  Title: ${title || 'Not provided'}`);
    console.log(`  Company: ${company || 'Not provided'}`);
    console.log(`  Email: ${email || 'Not provided'}`);
    console.log(`  Phone: ${phone || 'Not provided'}`);

    // TODO: Later, call barrierxService.createContact(req.body)
    // const result = await barrierxService.createContact({
    //   name,
    //   email,
    //   phone,
    //   company,
    // });

    res.json({
      success: true,
      message: 'Contact creation command received',
      contact: {
        name,
        title,
        company,
        email,
        phone,
      },
    });
  } catch (error) {
    console.error('❌ Create contact error:', error);
    res.status(500).json({
      error: 'Failed to process create contact command',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const handleCreateNote = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('\n📝 Received create_note command from ElevenLabs');
    console.log('⏰ Time:', new Date().toISOString());
    console.log('📋 Note Data:', JSON.stringify(req.body, null, 2));

    const {
      hs_note_body,
      hs_timestamp,
      deal_id,
      hubspot_owner_id,
      tenant_slug
    } = req.body;

    console.log('\n📊 Extracted Fields:');
    console.log(`  Note Body: ${hs_note_body || 'Not provided'}`);
    console.log(`  Timestamp: ${hs_timestamp || 'Not provided'}`);
    console.log(`  Deal ID: ${deal_id || 'Not provided'}`);
    console.log(`  Owner ID: ${hubspot_owner_id || 'Not provided'}`);
    console.log(`  Tenant Slug: ${tenant_slug || 'Not provided'}`);

    // Validate required fields
    if (!deal_id || !hs_note_body || !hubspot_owner_id || !tenant_slug) {
      console.error('❌ Missing required fields');
      res.status(400).json({
        success: false,
        error: 'Missing required fields: deal_id, hs_note_body, hubspot_owner_id, tenant_slug',
        received: { deal_id, hs_note_body: !!hs_note_body, hubspot_owner_id, tenant_slug },
      });
      return;
    }

    // Create note in HubSpot via BarrierX
    console.log('🚀 Calling BarrierX to create note in HubSpot...');
    const result = await barrierxService.createNoteEngagement({
      tenantSlug: tenant_slug,
      dealId: deal_id,
      ownerId: hubspot_owner_id,
      body: hs_note_body,
      timestamp: hs_timestamp ? parseInt(hs_timestamp) : Date.now(),
    });

    if (result.success) {
      console.log(`✅ Note created successfully! Engagement ID: ${result.engagementId}`);

      // Log the CRM action
      await loggingService.logCrmAction({
        actionType: 'NOTE',
        dealId: deal_id,
        tenantSlug: tenant_slug,
        ownerId: hubspot_owner_id,
        entityId: result.engagementId,
        body: hs_note_body,
        status: 'SUCCESS',
        metadata: req.body,
      });

      // Log webhook
      await loggingService.logWebhook({
        webhookType: 'ELEVENLABS_TOOL',
        eventType: 'create_note',
        status: 'SUCCESS',
        payload: req.body,
        response: { engagementId: result.engagementId },
      });

      res.json({
        success: true,
        message: 'Note created in HubSpot via BarrierX',
        engagementId: result.engagementId,
        note: {
          hs_note_body,
          hs_timestamp,
          deal_id,
          hubspot_owner_id,
          tenant_slug,
        },
      });
    } else {
      console.error(`❌ Failed to create note: ${result.error}`);

      // Log the failed CRM action
      await loggingService.logCrmAction({
        actionType: 'NOTE',
        dealId: deal_id,
        tenantSlug: tenant_slug,
        ownerId: hubspot_owner_id,
        body: hs_note_body,
        status: 'FAILED',
        errorMessage: result.error,
        metadata: req.body,
      });

      res.status(500).json({
        success: false,
        error: result.error || 'Failed to create note in HubSpot',
        details: 'BarrierX API returned an error',
      });
    }
  } catch (error) {
    console.error('❌ Create note error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process create note command',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const handleCreateMeeting = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('\n📅 Received create_meeting command from ElevenLabs');
    console.log('⏰ Time:', new Date().toISOString());
    console.log('📋 Meeting Data:', JSON.stringify(req.body, null, 2));

    const {
      deal_id,
      hubspot_owner_id,
      tenant_slug,
      hs_timestamp,
      hs_meeting_title,
      hs_meeting_start_time,
      hs_meeting_end_time,
      hs_meeting_body,
      hs_meeting_location,
      hs_meeting_outcome,
    } = req.body;

    console.log('\n📊 Extracted Fields:');
    console.log(`  Meeting Title: ${hs_meeting_title || 'Not provided'}`);
    console.log(`  Start Time: ${hs_meeting_start_time || 'Not provided'}`);
    console.log(`  End Time: ${hs_meeting_end_time || 'Not provided'}`);
    console.log(`  Deal ID: ${deal_id || 'Not provided'}`);
    console.log(`  Owner ID: ${hubspot_owner_id || 'Not provided'}`);
    console.log(`  Tenant Slug: ${tenant_slug || 'Not provided'}`);
    console.log(`  Body: ${hs_meeting_body || 'Not provided'}`);
    console.log(`  Location: ${hs_meeting_location || 'Not provided'}`);

    // Validate required fields
    if (!deal_id || !hs_meeting_title || !hs_meeting_start_time || !hs_meeting_end_time || !hubspot_owner_id || !tenant_slug) {
      console.error('❌ Missing required fields');
      res.status(400).json({
        success: false,
        error: 'Missing required fields: deal_id, hs_meeting_title, hs_meeting_start_time, hs_meeting_end_time, hubspot_owner_id, tenant_slug',
        received: {
          deal_id,
          hs_meeting_title: !!hs_meeting_title,
          hs_meeting_start_time: !!hs_meeting_start_time,
          hs_meeting_end_time: !!hs_meeting_end_time,
          hubspot_owner_id,
          tenant_slug
        },
      });
      return;
    }

    // Helper function to ensure ISO 8601 format with timezone
    const ensureTimezone = (time: string): string => {
      if (!time) return time;
      // If already has timezone (Z or +/- offset), return as is
      if (time.endsWith('Z') || time.includes('+') || time.match(/-\d{2}:\d{2}$/)) {
        return time;
      }
      // Add UTC timezone suffix
      return `${time}Z`;
    };

    // Format times to ensure HubSpot compatibility
    const formattedStartTime = ensureTimezone(hs_meeting_start_time);
    const formattedEndTime = ensureTimezone(hs_meeting_end_time);

    console.log(`  📅 Formatted Start Time: ${formattedStartTime}`);
    console.log(`  📅 Formatted End Time: ${formattedEndTime}`);

    // Validate that owner ID is numeric (HubSpot format, not UUID)
    if (!hubspot_owner_id || !/^\d+$/.test(hubspot_owner_id)) {
      console.error('❌ Invalid HubSpot owner ID format:', hubspot_owner_id);
      res.status(400).json({
        success: false,
        error: 'Invalid HubSpot owner ID: must be numeric',
        received: { hubspot_owner_id },
        expected_format: 'Numeric string (e.g., "84362397")',
        note: 'Do not use UUID format (e.g., "b7a7c13d-..."). Use the numeric HubSpot owner ID from dynamic variables.',
      });
      return;
    }

    // Validate that end time is after start time (no zero-duration meetings)
    const startMs = new Date(formattedStartTime).getTime();
    const endMs = new Date(formattedEndTime).getTime();
    const durationMinutes = (endMs - startMs) / 60000;

    if (durationMinutes <= 0) {
      console.error('❌ Invalid meeting duration: end time must be after start time');
      res.status(400).json({
        success: false,
        error: 'Invalid meeting duration: end time must be after start time',
        received: {
          start: formattedStartTime,
          end: formattedEndTime,
          durationMinutes: durationMinutes.toFixed(2),
        },
        note: 'HubSpot requires meetings to have a positive duration.',
      });
      return;
    }

    console.log(`  ✅ Validation passed: Duration is ${durationMinutes.toFixed(0)} minutes`);

    // Create meeting in HubSpot via BarrierX
    console.log('🚀 Calling BarrierX to create meeting in HubSpot...');
    const result = await barrierxService.createMeetingEngagement({
      tenantSlug: tenant_slug,
      dealId: deal_id,
      ownerId: hubspot_owner_id,
      subject: hs_meeting_title,
      body: hs_meeting_body || `Meeting scheduled from ${formattedStartTime} to ${formattedEndTime}${hs_meeting_location ? ` at ${hs_meeting_location}` : ''}`,
      startTime: formattedStartTime,
      endTime: formattedEndTime,
      timestamp: hs_timestamp ? parseInt(hs_timestamp) : Date.now(),
    });

    if (result.success) {
      console.log(`✅ Meeting created successfully! Engagement ID: ${result.engagementId}`);
      res.json({
        success: true,
        message: 'Meeting created in HubSpot via BarrierX',
        engagementId: result.engagementId,
        meeting: {
          hs_timestamp,
          hs_meeting_title,
          hs_meeting_start_time,
          hs_meeting_end_time,
          deal_id,
          hubspot_owner_id,
          tenant_slug,
          hs_meeting_body,
          hs_meeting_location,
        },
      });
    } else {
      console.error(`❌ Failed to create meeting: ${result.error}`);
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to create meeting in HubSpot',
        details: 'BarrierX API returned an error',
      });
    }
  } catch (error) {
    console.error('❌ Create meeting error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process create meeting command',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const handleCreateDeal = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('\n💼 Received create_deal command from ElevenLabs');
    console.log('⏰ Time:', new Date().toISOString());
    console.log('📋 Deal Data:', JSON.stringify(req.body, null, 2));

    const {
      dealname,
      dealstage,
      pipeline,
      amount,
      closedate,
      hubspot_owner_id,
    } = req.body;

    console.log('\n📊 Extracted Fields:');
    console.log(`  Deal Name: ${dealname || 'Not provided'}`);
    console.log(`  Deal Stage: ${dealstage || 'Not provided'}`);
    console.log(`  Pipeline: ${pipeline || 'Not provided'}`);
    console.log(`  Amount: ${amount || 'Not provided'}`);
    console.log(`  Close Date: ${closedate || 'Not provided'}`);
    console.log(`  Owner ID: ${hubspot_owner_id || 'Not provided'}`);

    // TODO: Later, call barrierxService.createDeal() when BarrierX endpoint is ready
    // const result = await barrierxService.createDeal({
    //   dealName: dealname,
    //   stage: dealstage,
    //   pipeline: pipeline,
    //   amount: amount,
    //   closeDate: closedate,
    //   ownerId: hubspot_owner_id,
    // });

    res.json({
      success: true,
      message: 'Deal creation command received',
      deal: {
        dealname,
        dealstage,
        pipeline,
        amount,
        closedate,
        hubspot_owner_id,
      },
    });
  } catch (error) {
    console.error('❌ Create deal error:', error);
    res.status(500).json({
      error: 'Failed to process create deal command',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
