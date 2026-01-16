import { Request, Response } from 'express';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import * as barrierxService from '../services/barrierxService';
import { config } from '../config/env';
import { verifyElevenLabsSignature } from '../utils/webhookVerification';
import { CLIENT_RENEG_LIMIT } from 'tls';
import { handleCallInitiationFailure, markCallAsSuccessful } from '../services/callRetryService';
import * as loggingService from '../services/loggingService';
import prisma from '../config/database';

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

    // Determine call type based on agent ID or dynamic variables
    const isPreMeetingCall = agentId === config.elevenlabs.preAgentId;
    const isPostMeetingCall = agentId === config.elevenlabs.postAgentId;
    const dynamicCallType = data.conversation_initiation_client_data?.dynamic_variables?.call_type;
    const isBarrierXInfoCall = agentId === config.elevenlabs.infoGatheringAgentId ||
      ['BARRIERX_INFO_GATHERING', 'LOST_DEAL_QUESTIONNAIRE', 'INACTIVITY_CHECK'].includes(dynamicCallType);

    const callType = isBarrierXInfoCall
      ? 'BARRIERX_INFO_GATHERING'
      : isPreMeetingCall
        ? 'PRE-MEETING'
        : isPostMeetingCall
          ? 'POST-MEETING'
          : 'UNKNOWN';

    console.log(`📋 Type: ${type}`);
    console.log(`📋 Call Type: ${callType} 🎯`);
    console.log(`📋 Conversation ID: ${conversationId}`);
    console.log(`📋 Agent ID: ${agentId}`);
    console.log(`📋 Status: ${status}`);

    // ═══════════════════════════════════════════════════════════════
    // BARRIERX INFO GATHERING CALL HANDLER
    // ═══════════════════════════════════════════════════════════════
    // Handle various ElevenLabs webhook types for info gathering calls
    const isEndEvent = type === 'conversation.ended' ||
      type === 'post_call_transcription' ||
      type === 'call_ended' ||
      type === 'call_failed' ||
      status === 'failed' ||
      status === 'no-answer' ||
      status === 'busy';

    if (isBarrierXInfoCall && isEndEvent) {
      console.log('\n🎯 Processing BarrierX Info Gathering call...');
      console.log(`   Webhook type: ${type}`);
      console.log(`   Status: ${status}`);

      await handleBarrierXInfoGatheringWebhook(req.body);

      res.json({
        success: true,
        message: 'BarrierX info gathering webhook processed',
        callType: 'BARRIERX_INFO_GATHERING',
        conversationId,
      });
      return;
    }

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
        callSuccessful: callSuccessful === 'success',
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

  } catch (error: any) {
    console.error('❌ Webhook processing error:', error);

    // Log error to database
    await loggingService.logError({
      errorType: 'EXTERNAL_SERVICE',
      severity: 'HIGH',
      source: 'webhookController.handleElevenLabsWebhook',
      message: error.message || 'Failed to process ElevenLabs webhook',
      stack: error.stack,
      endpoint: req.path,
      method: req.method,
      requestData: {
        eventType: req.body?.type,
        conversationId: req.body?.data?.conversation_id,
        agentId: req.body?.data?.agent_id,
      },
    });

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
  } catch (error: any) {
    console.error('❌ Create contact error:', error);

    // Log error to database
    await loggingService.logError({
      errorType: 'EXTERNAL_SERVICE',
      severity: 'MEDIUM',
      source: 'webhookController.handleCreateContact',
      message: error.message || 'Failed to create contact',
      stack: error.stack,
      endpoint: req.path,
      method: req.method,
      requestData: req.body,
    });

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
  } catch (error: any) {
    console.error('❌ Create note error:', error);

    // Log error to database
    await loggingService.logError({
      errorType: 'EXTERNAL_SERVICE',
      severity: 'HIGH',
      source: 'webhookController.handleCreateNote',
      message: error.message || 'Failed to create note',
      stack: error.stack,
      endpoint: req.path,
      method: req.method,
      requestData: {
        dealId: req.body.deal_id,
        tenantSlug: req.body.tenant_slug,
        ownerId: req.body.hubspot_owner_id,
      },
    });

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
  } catch (error: any) {
    console.error('❌ Create meeting error:', error);

    // Log error to database
    await loggingService.logError({
      errorType: 'EXTERNAL_SERVICE',
      severity: 'HIGH',
      source: 'webhookController.handleCreateMeeting',
      message: error.message || 'Failed to create meeting',
      stack: error.stack,
      endpoint: req.path,
      method: req.method,
      requestData: {
        dealId: req.body.deal_id,
        tenantSlug: req.body.tenant_slug,
        ownerId: req.body.hubspot_owner_id,
      },
    });

    res.status(500).json({
      success: false,
      error: 'Failed to process create meeting command',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const handleCreateTask = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('\n✅ Received create_task command from ElevenLabs');
    console.log('⏰ Time:', new Date().toISOString());
    console.log('📋 Task Data:', JSON.stringify(req.body, null, 2));

    const {
      deal_id,
      hubspot_owner_id,
      tenant_slug,
      hs_timestamp,
      hs_task_subject,
      hs_task_body,
      hs_task_type,
      hs_task_status,
      hs_task_priority,
    } = req.body;

    console.log('\n📊 Extracted Fields:');
    console.log(`  Task Subject: ${hs_task_subject || 'Not provided'}`);
    console.log(`  Due Date: ${hs_timestamp || 'Not provided'}`);
    console.log(`  Task Type: ${hs_task_type || 'TODO'}`);
    console.log(`  Priority: ${hs_task_priority || 'Not specified'}`);
    console.log(`  Status: ${hs_task_status || 'NOT_STARTED'}`);
    console.log(`  Deal ID: ${deal_id || 'Not provided'}`);
    console.log(`  Owner ID: ${hubspot_owner_id || 'Not provided'}`);
    console.log(`  Tenant Slug: ${tenant_slug || 'Not provided'}`);

    // Validate required fields
    if (!deal_id || !hs_task_subject || !hubspot_owner_id || !tenant_slug || !hs_timestamp) {
      console.error('❌ Missing required fields');
      res.status(400).json({
        success: false,
        error: 'Missing required fields: deal_id, hs_task_subject, hs_timestamp, hubspot_owner_id, tenant_slug',
        received: {
          deal_id,
          hs_task_subject: !!hs_task_subject,
          hs_timestamp: !!hs_timestamp,
          hubspot_owner_id,
          tenant_slug
        },
      });
      return;
    }

    // Convert ISO 8601 string to milliseconds timestamp
    let taskTimestamp: number;
    try {
      taskTimestamp = new Date(hs_timestamp).getTime();
      if (isNaN(taskTimestamp)) {
        throw new Error('Invalid timestamp format');
      }
    } catch (error: any) {
      console.error('❌ Invalid timestamp format:', hs_timestamp);

      // Log validation error
      await loggingService.logError({
        errorType: 'VALIDATION_ERROR',
        severity: 'LOW',
        source: 'webhookController.handleCreateTask.timestampValidation',
        message: `Invalid timestamp format: ${hs_timestamp}`,
        stack: error.stack,
        endpoint: req.path,
        method: req.method,
        requestData: { hs_timestamp, deal_id: req.body.deal_id },
      });

      res.status(400).json({
        success: false,
        error: 'Invalid timestamp format. Expected ISO 8601 format (e.g., 2025-12-23T10:00:00Z)',
        received: { hs_timestamp },
      });
      return;
    }

    // Create task in HubSpot via BarrierX
    console.log('🚀 Calling BarrierX to create task in HubSpot...');
    const result = await barrierxService.createTaskEngagement({
      tenantSlug: tenant_slug,
      dealId: deal_id,
      ownerId: hubspot_owner_id,
      subject: hs_task_subject,
      body: hs_task_body,
      timestamp: taskTimestamp,
      taskType: hs_task_type || 'TODO',
      status: hs_task_status || 'NOT_STARTED',
      priority: hs_task_priority,
    });

    if (result.success) {
      console.log(`✅ Task created successfully! Engagement ID: ${result.engagementId}`);

      // Log the CRM action
      await loggingService.logCrmAction({
        actionType: 'TASK',
        dealId: deal_id,
        tenantSlug: tenant_slug,
        ownerId: hubspot_owner_id,
        entityId: result.engagementId,
        title: hs_task_subject,
        body: hs_task_body,
        status: 'SUCCESS',
        metadata: req.body,
      });

      // Log webhook
      await loggingService.logWebhook({
        webhookType: 'ELEVENLABS_TOOL',
        eventType: 'create_task',
        status: 'SUCCESS',
        payload: req.body,
        response: { engagementId: result.engagementId },
      });

      res.json({
        success: true,
        message: 'Task created in HubSpot via BarrierX',
        engagementId: result.engagementId,
        task: {
          hs_task_subject,
          hs_timestamp,
          hs_task_type: hs_task_type || 'TODO',
          hs_task_status: hs_task_status || 'NOT_STARTED',
          hs_task_priority,
          deal_id,
          hubspot_owner_id,
          tenant_slug,
        },
      });
    } else {
      console.error(`❌ Failed to create task: ${result.error}`);

      // Log the failed CRM action
      await loggingService.logCrmAction({
        actionType: 'TASK',
        dealId: deal_id,
        tenantSlug: tenant_slug,
        ownerId: hubspot_owner_id,
        title: hs_task_subject,
        body: hs_task_body,
        status: 'FAILED',
        errorMessage: result.error,
        metadata: req.body,
      });

      res.status(500).json({
        success: false,
        error: result.error || 'Failed to create task in HubSpot',
        details: 'BarrierX API returned an error',
      });
    }
  } catch (error: any) {
    console.error('❌ Create task error:', error);

    // Log error to database
    await loggingService.logError({
      errorType: 'EXTERNAL_SERVICE',
      severity: 'HIGH',
      source: 'webhookController.handleCreateTask',
      message: error.message || 'Failed to create task',
      stack: error.stack,
      endpoint: req.path,
      method: req.method,
      requestData: {
        dealId: req.body.deal_id,
        tenantSlug: req.body.tenant_slug,
        ownerId: req.body.hubspot_owner_id,
      },
    });

    res.status(500).json({
      success: false,
      error: 'Failed to process create task command',
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
  } catch (error: any) {
    console.error('❌ Create deal error:', error);

    // Log error to database
    await loggingService.logError({
      errorType: 'EXTERNAL_SERVICE',
      severity: 'HIGH',
      source: 'webhookController.handleCreateDeal',
      message: error.message || 'Failed to create deal',
      stack: error.stack,
      endpoint: req.path,
      method: req.method,
      requestData: req.body,
    });

    res.status(500).json({
      error: 'Failed to process create deal command',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Handle Twilio Personalization Webhook for Inbound Calls
 * Called by ElevenLabs when someone calls back the Twilio number
 * Returns personalized context with FRESH data from BarrierX
 * 
 * Features:
 * - Detects voicemail vs real conversation
 * - Fetches current deal state + recent activities
 * - Differentiates between continuation, missed call, and voicemail
 */
export const handleTwilioPersonalizationWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('\n📞 ════════════════════════════════════════════════════');
    console.log('📞 INBOUND CALL - Twilio Personalization Webhook');
    console.log('📞 ════════════════════════════════════════════════════');

    const { caller_id, agent_id, called_number, call_sid } = req.body;

    console.log(`📱 Caller ID: ${caller_id}`);
    console.log(`🎯 Agent ID: ${agent_id}`);
    console.log(`📲 Called Number: ${called_number}`);
    console.log(`🆔 Twilio Call SID: ${call_sid}`);
    console.log(`⏰ Timestamp: ${new Date().toISOString()}`);

    const prisma = (await import('../config/database')).default;

    // Step 1: Find most recent post-meeting call
    // ⚡ OPTIMIZED: Only select fields we actually use (reduces data transfer)
    const recentCall = await prisma.callLog.findFirst({
      where: {
        phoneNumber: caller_id,
        callType: 'POST_CALL',
        initiatedAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      },
      select: {
        id: true,
        initiatedAt: true,
        status: true,
        dealId: true,
        dealName: true,
        transcriptSummary: true,
        webhookData: true,
        dynamicVariables: true,
        userId: true,
        userName: true,
        userEmail: true,
        meetingId: true,
        meetingTitle: true,
        ownerName: true,
      },
      orderBy: {
        initiatedAt: 'desc'
      }
    });

    // No recent context at all
    if (!recentCall) {
      console.log('⚠️  No recent post-meeting call found');
      console.log('📋 Returning generic greeting\n');

      res.json({
        type: 'conversation_initiation_client_data',
        dynamic_variables: {
          has_context: 'false',
          is_inbound_call: 'true',
        },
        conversation_config_override: {
          agent: {
            first_message: 'Hi! Thanks for calling. How can I help you today?'
          }
        }
      });
      return;
    }

    console.log(`\n✅ Found recent call from ${recentCall.initiatedAt.toLocaleString()}`);
    console.log(`   Status: ${recentCall.status}`);
    console.log(`   Deal: ${recentCall.dealName}`);

    // Step 2: Check if voicemail
    const { isVoicemailCall } = await import('../utils/formatters');
    const webhookData = recentCall.webhookData as any;
    const callDuration = webhookData?.metadata?.call_duration_secs || 0;
    const wasVoicemail = isVoicemailCall(
      recentCall.transcriptSummary,
      webhookData,
      callDuration
    );

    console.log(`   Voicemail: ${wasVoicemail ? 'Yes' : 'No'}`);

    // Step 3: Determine if TRUE continuation (real conversation, not voicemail)
    const isRealConversation =
      recentCall.status === 'COMPLETED' &&
      recentCall.transcriptSummary != null &&
      !wasVoicemail;

    console.log(`   Is Continuation: ${isRealConversation ? 'Yes' : 'No'}`);

    // Step 4: Extract deal identifiers
    let originalVars = recentCall.dynamicVariables as any;
    let dealId = originalVars?.deal_id;
    let tenantSlug = originalVars?.tenant_slug;

    // 🔥 FALLBACK: If dynamicVariables is null, extract from webhookData
    if (!dealId && recentCall.webhookData) {
      console.log('   ℹ️  dynamicVariables is null, checking webhookData...');
      const webhookData = recentCall.webhookData as any;
      const initData = webhookData?.data?.conversation_initiation_client_data?.dynamic_variables;

      if (initData) {
        console.log('   ✅ Found dynamicVariables in webhookData (fallback successful)');
        dealId = initData.deal_id || initData.dealId;
        tenantSlug = initData.tenant_slug;

        // Use all variables from webhookData
        originalVars = initData;
      }
    }

    if (!dealId || !tenantSlug) {
      console.log('⚠️  Missing deal_id or tenant_slug (checked both dynamicVariables and webhookData)');
      res.json({
        type: 'conversation_initiation_client_data',
        dynamic_variables: {
          has_context: 'false',
        },
        conversation_config_override: {
          agent: {
            first_message: 'Hi! Thanks for calling. How can I help you today?'
          }
        }
      });
      return;
    }

    // Step 5: Fetch FRESH deal data from BarrierX
    console.log(`\n🔄 Fetching fresh deal data from BarrierX...`);
    let dealContext;
    try {
      dealContext = await barrierxService.getDealContextForContinuation(tenantSlug, dealId);
    } catch (error: any) {
      console.error('❌ Failed to fetch deal context, using stale data');

      // Log deal context fetch failure (non-critical, we have fallback)
      await loggingService.logError({
        errorType: 'EXTERNAL_SERVICE',
        severity: 'MEDIUM',
        source: 'webhookController.handleTwilioPersonalizationWebhook.fetchDealContext',
        message: error.message || 'Failed to fetch fresh deal context for inbound call',
        stack: error.stack,
        requestData: {
          tenantSlug,
          dealId,
          callSid: req.body.call_sid,
        },
      });

      dealContext = null;
    }

    // Step 6: Build dynamic variables
    const deal = dealContext?.deal || {};
    const owner = deal.owner || {};

    // Get current time in owner's timezone
    const ownerTimezone = owner.timezone || originalVars?.current_timezone || 'UTC';
    const now = new Date();

    const currentDateLocal = now.toLocaleDateString('en-US', {
      timeZone: ownerTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    const currentTimeLocal = now.toLocaleTimeString('en-US', {
      timeZone: ownerTimezone,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const currentDayOfWeek = now.toLocaleDateString('en-US', {
      timeZone: ownerTimezone,
      weekday: 'long'
    });

    // Format fresh context using formatters
    const {
      formatRecentNotes,
      formatTasks,
      countOpenTasks,
      getTimeElapsed
    } = await import('../utils/formatters');

    const recentNotesText = dealContext
      ? formatRecentNotes(dealContext.recentNotes)
      : 'Unable to fetch recent notes';

    const openTasksList = dealContext
      ? formatTasks(dealContext.openTasks)
      : 'Unable to fetch tasks';

    const openTasksCount = dealContext
      ? countOpenTasks(dealContext.openTasks)
      : 0;

    const dynamicVariables = {
      // Fresh deal info
      deal_name: deal.dealName || originalVars?.deal_name,
      deal_stage: deal.stage || originalVars?.deal_stage,
      deal_amount: deal.amount?.toString() || originalVars?.deal_amount,
      close_date: deal.closeDate || originalVars?.close_date,

      // Owner info
      owner_name: owner.name || originalVars?.owner_name,
      owner_email: owner.email || originalVars?.owner_email,
      owner_phone: owner.phone || originalVars?.owner_phone,

      // Fresh context from BarrierX
      recent_notes_summary: recentNotesText,
      open_tasks_list: openTasksList,
      open_tasks_count: openTasksCount.toString(),

      // Risks
      total_risk: deal.userDealRiskScores?.totalDealRisk?.toString() || '',
      champion_health: deal.championHealth?.toString() || '',

      // Context flags
      has_context: 'true',
      has_fresh_data: dealContext ? 'true' : 'false',
      is_continuation: isRealConversation ? 'true' : 'false',
      is_voicemail_left: wasVoicemail ? 'true' : 'false',
      is_missed_call_return: (!isRealConversation && !wasVoicemail) ? 'true' : 'false',
      is_inbound_call: 'true',

      // Previous call info
      last_call_date: recentCall.initiatedAt.toLocaleDateString(),
      last_call_time: recentCall.initiatedAt.toLocaleTimeString(),
      last_call_status: recentCall.status,
      last_call_summary: isRealConversation ? (recentCall.transcriptSummary || '') : '',
      time_since_last_call: getTimeElapsed(recentCall.initiatedAt),

      // CRM identifiers
      deal_id: dealId,
      tenant_slug: tenantSlug,
      hubspot_owner_id: owner.hubspotId || originalVars?.hubspot_owner_id,

      // Current time
      current_date_utc: now.toISOString().split('T')[0],
      current_time_utc: now.toISOString(),
      current_timezone: ownerTimezone,
      current_date_local: currentDateLocal,
      current_time_local: currentTimeLocal,
      current_day_of_week: currentDayOfWeek,
      current_timezone_offset: originalVars?.current_timezone_offset || '',
      current_timestamp_ms: now.getTime().toString(),
      current_datetime_utc: now.toISOString(),
    };

    // Step 7: Build customized first message based on scenario
    const ownerFirstName = (owner.name || originalVars?.owner_name || 'there').split(' ')[0];
    const dealName = dynamicVariables.deal_name;

    let firstMessage = '';
    if (isRealConversation) {
      // TRUE CONTINUATION
      firstMessage = `Hi ${ownerFirstName}! Following up on our conversation from ${dynamicVariables.last_call_date}. I see you have ${openTasksCount} outstanding task${openTasksCount === 1 ? '' : 's'} for the ${dealName} deal. Want to discuss?`;
    } else if (wasVoicemail) {
      // VOICEMAIL LEFT
      firstMessage = `Hi ${ownerFirstName}! Thanks for calling back. I left you a voicemail earlier about the ${dealName} deal. Do you have a few minutes to discuss the follow-up?`;
    } else {
      // MISSED CALL
      firstMessage = `Hi ${ownerFirstName}! Thanks for calling back. I tried reaching you earlier about the ${dealName} deal. Do you have time now?`;
    }

    const response = {
      type: 'conversation_initiation_client_data',
      dynamic_variables: dynamicVariables,
      conversation_config_override: {
        agent: {
          first_message: firstMessage
        }
      }
    };

    console.log('\n✅ Personalization response prepared');
    console.log(`   Continuation: ${isRealConversation}`);
    console.log(`   Fresh Data: ${!!dealContext}`);
    console.log(`   Open Tasks: ${openTasksCount}`);

    // Step 8: Log inbound call
    // Look up correct database userId by email (recentCall.userId might contain wrong ID from historical data)
    const dbUser = await prisma.user.findUnique({
      where: { email: recentCall.userEmail },
      select: { id: true },
    });

    await loggingService.logCallInitiation({
      callType: 'POST_CALL',
      userId: dbUser?.id || recentCall.userId, // Use correct DB UUID; fallback to stored value if user not found
      userName: recentCall.userName,
      userEmail: recentCall.userEmail,
      dealId: recentCall.dealId,
      dealName: recentCall.dealName,
      meetingId: recentCall.meetingId,
      meetingTitle: recentCall.meetingTitle,
      phoneNumber: caller_id,
      ownerName: recentCall.ownerName ?? undefined,
      agentId: agent_id,
      triggerSource: 'WEBHOOK',
      conversationId: undefined,
      callSid: call_sid,
      dynamicVariables: response.dynamic_variables,
      parentCallId: recentCall.id,
    });

    console.log('📤 Sending response to ElevenLabs\n');
    res.json(response);

  } catch (error: any) {
    console.error('❌ Webhook error:', error);
    console.error('   Stack:', error instanceof Error ? error.stack : 'No stack trace');

    // Log critical inbound call error
    await loggingService.logError({
      errorType: 'EXTERNAL_SERVICE',
      severity: 'CRITICAL',
      source: 'webhookController.handleTwilioPersonalizationWebhook',
      message: error.message || 'Failed to process inbound call personalization',
      stack: error.stack,
      endpoint: req.path,
      method: req.method,
      requestData: {
        callSid: req.body.call_sid,
        callerId: req.body.caller_id,
        agentId: req.body.agent_id,
      },
    });

    res.json({
      type: 'conversation_initiation_client_data',
      dynamic_variables: { has_context: 'false' },
      conversation_config_override: {
        agent: {
          first_message: 'Hi! Thanks for calling. How can I help you today?'
        }
      }
    });
  }
};

/**
 * Handle BarrierX Info Gathering Webhook
 * Processes completed info gathering calls and extracts structured answers
 * 
 * Questions asked:
 * 1. What are the quantified pain points for the client?
 * 2. Who is the champion?
 * 3. Who is the economic buyer?
 */
async function handleBarrierXInfoGatheringWebhook(webhookData: any): Promise<void> {
  const prisma = (await import('../config/database')).default;

  const data = webhookData.data || {};
  const conversationId = data.conversation_id;
  const analysis = data.analysis || {};
  const transcript = data.transcript || [];
  const metadata = data.metadata || {};
  const callDuration = metadata.call_duration_secs || 0;
  const transcriptSummary = analysis.transcript_summary || '';
  const terminationReason = metadata.termination_reason || '';

  // Determine if call was successful - check multiple indicators
  const wasAnswered = callDuration > 0;
  const isNoAnswer = terminationReason.toLowerCase().includes('no_answer') ||
    terminationReason.toLowerCase().includes('no answer') ||
    terminationReason.toLowerCase().includes('unanswered') ||
    data.status === 'no-answer';
  const isBusy = terminationReason.toLowerCase().includes('busy') || data.status === 'busy';
  const isFailed = terminationReason.toLowerCase().includes('failed') || data.status === 'failed';

  const callSuccessful = analysis.call_successful === 'success' && wasAnswered && !isNoAnswer && !isBusy && !isFailed;

  // Determine failure reason for logging
  let failureReason = '';
  if (!callSuccessful) {
    if (isNoAnswer) failureReason = 'No Answer';
    else if (isBusy) failureReason = 'Busy';
    else if (isFailed) failureReason = 'Failed';
    else if (!wasAnswered) failureReason = 'Not Answered (0 duration)';
    else failureReason = analysis.call_successful || 'Unknown';
  }

  console.log(`   📞 Conversation ID: ${conversationId}`);
  console.log(`   ⏱️  Duration: ${callDuration}s`);
  console.log(`   📱 Termination: ${terminationReason}`);
  console.log(`   ✅ Successful: ${callSuccessful}${!callSuccessful ? ` (${failureReason})` : ''}`);

  // Extract answers from data collection (if agent uses structured data collection)
  const dataCollection = analysis.data_collection || {};

  // Try to extract answers from data collection fields
  let quantifiedPainPoints = dataCollection.quantified_pain_points ||
    dataCollection.pain_points ||
    null;
  let championInfo = dataCollection.champion ||
    dataCollection.champion_info ||
    null;
  let economicBuyerInfo = dataCollection.economic_buyer ||
    dataCollection.economic_buyer_info ||
    null;

  // If no structured data, try to extract from transcript summary
  if (!quantifiedPainPoints && !championInfo && !economicBuyerInfo && transcriptSummary) {
    console.log('   ℹ️  No structured data - using transcript summary');
    // The AI agent should structure responses, but we log the full summary as fallback
  }

  // Update the record in database
  try {
    // Get dynamic variables for fallback lookup and data enrichment
    const dynamicVars = data.conversation_initiation_client_data?.dynamic_variables || {};
    const dealId = dynamicVars.deal_id;

    // Try to find existing record by conversation_id first
    let existingRecord = await prisma.barrierXInfoGathering.findUnique({
      where: { conversationId },
    });

    // Fallback: lookup by deal_id if conversation_id doesn't match
    if (!existingRecord && dealId) {
      console.log(`   ℹ️ No record found by conversation_id, trying deal_id: ${dealId}`);
      existingRecord = await prisma.barrierXInfoGathering.findFirst({
        where: { dealId },
        orderBy: { createdAt: 'desc' },
      });

      if (existingRecord) {
        console.log(`   ✅ Found record by deal_id: ${existingRecord.id}`);
        // Update the conversation_id on the existing record
        await prisma.barrierXInfoGathering.update({
          where: { id: existingRecord.id },
          data: { conversationId },
        });
      }
    }

    if (existingRecord) {
      await prisma.barrierXInfoGathering.update({
        where: { id: existingRecord.id },
        data: {
          status: callSuccessful ? 'COMPLETED' : 'FAILED',
          conversationId, // Ensure conversation_id is set
          quantifiedPainPoints: quantifiedPainPoints || transcriptSummary || null,
          championInfo: championInfo || null,
          economicBuyerInfo: economicBuyerInfo || null,
          callDuration,
          transcriptSummary,
          rawTranscript: transcript,
          completedAt: new Date(),
          // Fill in owner/deal info if they were placeholders
          ...(existingRecord.dealName === 'Unknown (from server tool callback)' && dynamicVars.deal_name && {
            dealName: dynamicVars.deal_name,
          }),
          ...(existingRecord.ownerName === 'Unknown' && dynamicVars.owner_name && {
            ownerName: dynamicVars.owner_name,
          }),
          ...((!existingRecord.ownerEmail || existingRecord.ownerEmail === '') && dynamicVars.owner_email && {
            ownerEmail: dynamicVars.owner_email,
          }),
          ...((!existingRecord.ownerPhone || existingRecord.ownerPhone === '') && {
            ownerPhone: metadata.phone_call?.external_number || dynamicVars.owner_phone || '',
          }),
          ...(existingRecord.tenantSlug === 'unknown' && dynamicVars.tenant_slug && {
            tenantSlug: dynamicVars.tenant_slug,
          }),
          ...(!existingRecord.tenantName && dynamicVars.tenant_name && {
            tenantName: dynamicVars.tenant_name,
          }),
          ...(!existingRecord.companyName && dynamicVars.company_name && {
            companyName: dynamicVars.company_name,
          }),
          ...(!existingRecord.hubspotOwnerId && dynamicVars.hubspot_owner_id && {
            hubspotOwnerId: dynamicVars.hubspot_owner_id,
          }),
        },
      });
      console.log(`   ✅ Updated BarrierXInfoGathering record: ${existingRecord.id}`);
    } else {
      console.log(`   ⚠️  No existing record found for conversation: ${conversationId}`);

      // Try to create a new record from webhook data
      const dynamicVars = data.conversation_initiation_client_data?.dynamic_variables || {};

      if (dynamicVars.deal_id) {
        await prisma.barrierXInfoGathering.create({
          data: {
            conversationId,
            dealId: dynamicVars.deal_id,
            dealName: dynamicVars.deal_name || 'Unknown',
            tenantSlug: dynamicVars.tenant_slug || 'unknown',
            tenantName: dynamicVars.tenant_name || null,
            companyName: dynamicVars.company_name || null,
            ownerName: dynamicVars.owner_name || 'Unknown',
            ownerEmail: dynamicVars.owner_email || '',
            ownerPhone: metadata.phone_call?.external_number || '',
            hubspotOwnerId: dynamicVars.hubspot_owner_id || null,
            status: callSuccessful ? 'COMPLETED' : 'FAILED',
            quantifiedPainPoints: quantifiedPainPoints || transcriptSummary || null,
            championInfo: championInfo || null,
            economicBuyerInfo: economicBuyerInfo || null,
            callDuration,
            transcriptSummary,
            rawTranscript: transcript,
            completedAt: new Date(),
          },
        });
        console.log(`   ✅ Created new BarrierXInfoGathering record from webhook data`);
      }
    }
  } catch (error: any) {
    console.error(`   ❌ Failed to update database:`, error.message);

    // Log error
    await loggingService.logError({
      errorType: 'DATABASE_ERROR',
      severity: 'HIGH',
      source: 'webhookController.handleBarrierXInfoGatheringWebhook',
      message: error.message || 'Failed to save BarrierX info gathering data',
      stack: error.stack,
      requestData: { conversationId },
    });
  }

  // Log the webhook
  await loggingService.logWebhook({
    webhookType: 'ELEVENLABS_CALL',
    eventType: 'barrierx_info_gathering_completed',
    conversationId,
    agentId: data.agent_id,
    status: 'SUCCESS',
    payload: webhookData,
  });
}

/**
 * Handle BarrierX Info Gathering Server Tool Callback
 * Called DURING the call by ElevenLabs agent when it gathers info from deal owner
 * 
 * Expected payload from server tool:
 * - quantified_pain_points: string
 * - champion: string
 * - economic_buyer: string
 * - deal_id: string
 * - conversation_id: string
 */
export const handleZeroScoreCallback = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('\n🎯 ════════════════════════════════════════════════════');
    console.log('🎯 ZERO SCORE INFO - Server Tool Callback');
    console.log('🎯 ════════════════════════════════════════════════════');
    console.log('⏰ Time:', new Date().toISOString());
    console.log('📦 Raw Body:', JSON.stringify(req.body, null, 2));

    const {
      quantified_pain_points,
      champion,
      economic_buyer,
      deal_id,
      conversation_id,
    } = req.body;

    console.log('\n📋 Extracted Data:');
    console.log(`   Deal ID: ${deal_id || 'not provided'}`);
    console.log(`   Conversation ID: ${conversation_id || 'not provided'}`);
    console.log(`   Pain Points: ${quantified_pain_points ? quantified_pain_points.substring(0, 100) + '...' : 'not provided'}`);
    console.log(`   Champion: ${champion || 'not provided'}`);
    console.log(`   Economic Buyer: ${economic_buyer || 'not provided'}`);

    // Try to find existing record by conversation_id or deal_id
    let existingRecord = null;

    if (conversation_id) {
      existingRecord = await prisma.barrierXInfoGathering.findUnique({
        where: { conversationId: conversation_id },
      });
    }

    if (!existingRecord && deal_id) {
      existingRecord = await prisma.barrierXInfoGathering.findFirst({
        where: { dealId: deal_id },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (existingRecord) {
      // Update existing record
      await prisma.barrierXInfoGathering.update({
        where: { id: existingRecord.id },
        data: {
          quantifiedPainPoints: quantified_pain_points || existingRecord.quantifiedPainPoints,
          championInfo: champion || existingRecord.championInfo,
          economicBuyerInfo: economic_buyer || existingRecord.economicBuyerInfo,
          status: 'IN_PROGRESS',
          conversationId: conversation_id || existingRecord.conversationId,
        },
      });
      console.log(`   ✅ Updated existing record: ${existingRecord.id}`);
    } else {
      // Create new record if none exists (fallback)
      console.log(`   ⚠️ No existing record found - creating new one`);
      const newRecord = await prisma.barrierXInfoGathering.create({
        data: {
          dealId: deal_id || 'unknown',
          dealName: 'Unknown (from server tool callback)',
          tenantSlug: 'unknown',
          ownerName: 'Unknown',
          ownerEmail: '',
          ownerPhone: '',
          conversationId: conversation_id || null,
          quantifiedPainPoints: quantified_pain_points || null,
          championInfo: champion || null,
          economicBuyerInfo: economic_buyer || null,
          status: 'IN_PROGRESS',
        },
      });
      console.log(`   ✅ Created new record: ${newRecord.id}`);
    }

    // Log to AgentX logging system
    await loggingService.logWebhook({
      webhookType: 'ELEVENLABS_TOOL',
      eventType: 'barrierx_info_callback',
      conversationId: conversation_id,
      agentId: config.elevenlabs.infoGatheringAgentId,
      status: 'SUCCESS',
      payload: req.body,
    });

    console.log('   ✅ Logged to AgentX logging system');

    // Return success to ElevenLabs
    res.json({
      success: true,
      message: 'Information saved successfully. Thank the user for providing this information.',
      data: {
        deal_id,
        conversation_id,
        saved_at: new Date().toISOString(),
        pain_points_received: !!quantified_pain_points,
        champion_received: !!champion,
        economic_buyer_received: !!economic_buyer,
      },
    });

  } catch (error: any) {
    console.error('❌ Error in BarrierX info callback:', error);

    await loggingService.logError({
      errorType: 'EXTERNAL_SERVICE',
      severity: 'HIGH',
      source: 'webhookController.handleZeroScoreCallback',
      message: error.message || 'Failed to save BarrierX info',
      stack: error.stack,
      endpoint: req.path,
      requestData: req.body,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to save information',
      message: 'There was an issue saving the information. Please try again.',
    });
  }
};

/**
 * Handle Lost Deal Questionnaire - Server Tool Callback
 * 
 * This is called during a Lost Deal call when the ElevenLabs agent
 * has gathered feedback about why the deal was lost.
 * 
 * Expected body:
 * - loss_reason: string (Q1: What was the primary reason this deal was lost?)
 * - competitor_name: string (Q2: Who was the deal lost to?)
 * - lessons_learned: string (Q3: What could we improve for next time?)
 * - deal_id: string
 * - conversation_id: string
 */
export const handleLostDealCallback = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('\n💔 ════════════════════════════════════════════════════');
    console.log('💔 LOST DEAL QUESTIONNAIRE - Server Tool Callback');
    console.log('💔 ════════════════════════════════════════════════════');
    console.log('⏰ Time:', new Date().toISOString());
    console.log('📦 Raw Body:', JSON.stringify(req.body, null, 2));

    const {
      loss_reason,
      competitor_name,
      lessons_learned,
      deal_id,
      conversation_id,
    } = req.body;

    console.log('\n📋 Extracted Data:');
    console.log(`   Deal ID: ${deal_id || 'not provided'}`);
    console.log(`   Conversation ID: ${conversation_id || 'not provided'}`);
    console.log(`   Loss Reason: ${loss_reason ? loss_reason.substring(0, 100) + '...' : 'not provided'}`);
    console.log(`   Competitor: ${competitor_name || 'not provided'}`);
    console.log(`   Lessons Learned: ${lessons_learned ? lessons_learned.substring(0, 100) + '...' : 'not provided'}`);

    // Try to find existing record by conversation_id or deal_id
    let existingRecord = null;

    if (conversation_id) {
      existingRecord = await prisma.barrierXInfoGathering.findUnique({
        where: { conversationId: conversation_id },
      });
    }

    if (!existingRecord && deal_id) {
      existingRecord = await prisma.barrierXInfoGathering.findFirst({
        where: {
          dealId: deal_id,
          gatheringType: 'LOST_DEAL',
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (existingRecord) {
      // Update existing record
      await prisma.barrierXInfoGathering.update({
        where: { id: existingRecord.id },
        data: {
          lossReason: loss_reason || existingRecord.lossReason,
          competitorName: competitor_name || existingRecord.competitorName,
          lessonsLearned: lessons_learned || existingRecord.lessonsLearned,
          status: 'IN_PROGRESS',
          conversationId: conversation_id || existingRecord.conversationId,
        },
      });
      console.log(`   ✅ Updated existing record: ${existingRecord.id}`);
    } else {
      // Create new record if none exists (fallback)
      console.log(`   ⚠️ No existing record found - creating new one`);
      const newRecord = await prisma.barrierXInfoGathering.create({
        data: {
          gatheringType: 'LOST_DEAL',
          dealId: deal_id || 'unknown',
          dealName: 'Unknown (from server tool callback)',
          tenantSlug: 'unknown',
          ownerName: 'Unknown',
          ownerEmail: '',
          ownerPhone: '',
          conversationId: conversation_id || null,
          lossReason: loss_reason || null,
          competitorName: competitor_name || null,
          lessonsLearned: lessons_learned || null,
          status: 'IN_PROGRESS',
        },
      });
      console.log(`   ✅ Created new record: ${newRecord.id}`);
    }

    // Log to AgentX logging system
    await loggingService.logWebhook({
      webhookType: 'ELEVENLABS_TOOL',
      eventType: 'lost_deal_callback',
      conversationId: conversation_id,
      agentId: config.elevenlabs.infoGatheringAgentId,
      status: 'SUCCESS',
      payload: req.body,
    });

    console.log('   ✅ Logged to AgentX logging system');

    // Return success to ElevenLabs
    res.json({
      success: true,
      message: 'Feedback saved successfully. Thank the user for sharing this valuable feedback.',
      data: {
        deal_id,
        conversation_id,
        saved_at: new Date().toISOString(),
        loss_reason_received: !!loss_reason,
        competitor_received: !!competitor_name,
        lessons_received: !!lessons_learned,
      },
    });

  } catch (error: any) {
    console.error('❌ Error in Lost Deal callback:', error);

    await loggingService.logError({
      errorType: 'EXTERNAL_SERVICE',
      severity: 'HIGH',
      source: 'webhookController.handleLostDealCallback',
      message: error.message || 'Failed to save lost deal feedback',
      stack: error.stack,
      endpoint: req.path,
      requestData: req.body,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to save feedback',
      message: 'There was an issue saving the feedback. Please try again.',
    });
  }
};

/**
 * Handle Inactivity Check - Server Tool Callback
 * 
 * This is called during an Inactivity call when the ElevenLabs agent
 * has gathered information about a stale deal.
 * 
 * Expected body:
 * - current_status: string (Q1: What's the current status of this deal?)
 * - blockers: string (Q2: Are there any blockers or challenges?)
 * - next_steps: string (Q3: What are the next steps you're planning?)
 * - deal_id: string
 * - conversation_id: string
 */
export const handleInactivityCallback = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('\n⏰ ════════════════════════════════════════════════════');
    console.log('⏰ INACTIVITY CHECK - Server Tool Callback');
    console.log('⏰ ════════════════════════════════════════════════════');
    console.log('⏰ Time:', new Date().toISOString());
    console.log('📦 Raw Body:', JSON.stringify(req.body, null, 2));

    const {
      current_status,
      blockers,
      next_steps,
      deal_id,
      conversation_id,
    } = req.body;

    console.log('\n📋 Extracted Data:');
    console.log(`   Deal ID: ${deal_id || 'not provided'}`);
    console.log(`   Conversation ID: ${conversation_id || 'not provided'}`);
    console.log(`   Current Status: ${current_status ? current_status.substring(0, 100) + '...' : 'not provided'}`);
    console.log(`   Blockers: ${blockers ? blockers.substring(0, 100) + '...' : 'not provided'}`);
    console.log(`   Next Steps: ${next_steps ? next_steps.substring(0, 100) + '...' : 'not provided'}`);

    // Try to find existing record by conversation_id or deal_id
    let existingRecord = null;

    if (conversation_id) {
      existingRecord = await prisma.barrierXInfoGathering.findUnique({
        where: { conversationId: conversation_id },
      });
    }

    if (!existingRecord && deal_id) {
      existingRecord = await prisma.barrierXInfoGathering.findFirst({
        where: {
          dealId: deal_id,
          gatheringType: 'INACTIVITY',
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (existingRecord) {
      // Update existing record
      await prisma.barrierXInfoGathering.update({
        where: { id: existingRecord.id },
        data: {
          inactivityStatus: current_status || existingRecord.inactivityStatus,
          inactivityBlockers: blockers || existingRecord.inactivityBlockers,
          inactivityNextSteps: next_steps || existingRecord.inactivityNextSteps,
          status: 'IN_PROGRESS',
          conversationId: conversation_id || existingRecord.conversationId,
        },
      });
      console.log(`   ✅ Updated existing record: ${existingRecord.id}`);
    } else {
      // Create new record if none exists (fallback)
      console.log(`   ⚠️ No existing record found - creating new one`);
      const newRecord = await prisma.barrierXInfoGathering.create({
        data: {
          gatheringType: 'INACTIVITY',
          dealId: deal_id || 'unknown',
          dealName: 'Unknown (from server tool callback)',
          tenantSlug: 'unknown',
          ownerName: 'Unknown',
          ownerEmail: '',
          ownerPhone: '',
          conversationId: conversation_id || null,
          inactivityStatus: current_status || null,
          inactivityBlockers: blockers || null,
          inactivityNextSteps: next_steps || null,
          status: 'IN_PROGRESS',
        },
      });
      console.log(`   ✅ Created new record: ${newRecord.id}`);
    }

    // Log to AgentX logging system
    await loggingService.logWebhook({
      webhookType: 'ELEVENLABS_TOOL',
      eventType: 'inactivity_callback',
      conversationId: conversation_id,
      agentId: config.elevenlabs.infoGatheringAgentId,
      status: 'SUCCESS',
      payload: req.body,
    });

    console.log('   ✅ Logged to AgentX logging system');

    // Return success to ElevenLabs
    res.json({
      success: true,
      message: 'Update saved successfully. Thank the user for the status update.',
      data: {
        deal_id,
        conversation_id,
        saved_at: new Date().toISOString(),
        status_received: !!current_status,
        blockers_received: !!blockers,
        next_steps_received: !!next_steps,
      },
    });

  } catch (error: any) {
    console.error('❌ Error in Inactivity callback:', error);

    await loggingService.logError({
      errorType: 'EXTERNAL_SERVICE',
      severity: 'HIGH',
      source: 'webhookController.handleInactivityCallback',
      message: error.message || 'Failed to save inactivity check',
      stack: error.stack,
      endpoint: req.path,
      requestData: req.body,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to save update',
      message: 'There was an issue saving the update. Please try again.',
    });
  }
};
