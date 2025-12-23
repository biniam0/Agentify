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
    } catch (error) {
      console.error('❌ Invalid timestamp format:', hs_timestamp);
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
  } catch (error) {
    console.error('❌ Create task error:', error);
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
  } catch (error) {
    console.error('❌ Create deal error:', error);
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
    const recentCall = await prisma.callLog.findFirst({
      where: {
        phoneNumber: caller_id,
        callType: 'POST_CALL',
        initiatedAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
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
    } catch (error) {
      console.error('❌ Failed to fetch deal context, using stale data');
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
    await loggingService.logCallInitiation({
      callType: 'POST_CALL',
      userId: recentCall.userId,
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

  } catch (error) {
    console.error('❌ Webhook error:', error);
    console.error('   Stack:', error instanceof Error ? error.stack : 'No stack trace');
    
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
