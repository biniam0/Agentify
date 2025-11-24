import { Request, Response } from 'express';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import * as barrierxService from '../services/barrierxService';
import { config } from '../config/env';
import { verifyElevenLabsSignature } from '../utils/webhookVerification';
import { CLIENT_RENEG_LIMIT } from 'tls';

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

    console.log(`💼 Deal ID: ${dealId}`);
    console.log(`👤 Customer: ${customerName}`);

    // Extract full transcript
    const transcript = data.transcript || [];
    const fullTranscript = transcript.map((entry: any) =>
      `${entry.role}: ${entry.message}`
    ).join('\n');

    // Create note in HubSpot via BarrierX
    if (dealId) {
      console.log('\n📝 Creating note in HubSpot via BarrierX...');

      const noteContent = `
=== ${callType} Call Summary ===
Title: ${callSummaryTitle}
Call Status: ${callSuccessful}
Duration: ${callDuration} seconds
Called Number: ${calledNumber}
Termination: ${terminationReason}

Summary:
${transcriptSummary}

Full Transcript:
${fullTranscript}

Conversation ID: ${conversationId}
Call Type: ${callType}
Timestamp: ${new Date(event_timestamp * 1000).toISOString()}
      `.trim();

      const noteResult = await barrierxService.createNote({
        dealId: dealId,
        content: noteContent,
        userId: 'system-elevenlabs',
      });

      console.log(`✅ Note created successfully! Note ID: ${noteResult.noteId}`);
    } else {
      console.log('⚠️  No dealId found in dynamic variables, skipping note creation');
    }

    // Optional: Create contact if new contact info is detected
    // Optional: Update deal if needed

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
    console.log(`  Timestamp: ${hs_timestamp || 'Not provided'}`);
    console.log(`  Owner ID: ${hubspot_owner_id || 'Not provided'}`);
    console.log(`  Body: ${hs_meeting_body || 'Not provided'}`);
    console.log(`  Location: ${hs_meeting_location || 'Not provided'}`);
    console.log(`  Outcome: ${hs_meeting_outcome || 'Not provided'}`);

    // TODO: Later, call barrierxService.createMeeting() when BarrierX endpoint is ready
    // const result = await barrierxService.createMeeting({
    //   dealId: deal_id,
    //   title: hs_meeting_title,
    //   startTime: hs_meeting_start_time,
    //   endTime: hs_meeting_end_time,
    //   body: hs_meeting_body,
    //   location: hs_meeting_location,
    //   outcome: hs_meeting_outcome,
    //   ownerId: hubspot_owner_id,
    // });

    res.json({
      success: true,
      message: 'Meeting creation command received',
      meeting: {
        hs_timestamp,
        hs_meeting_title,
        hs_meeting_start_time,
        hs_meeting_end_time,
        deal_id,
        hubspot_owner_id,
        hs_meeting_body,
        hs_meeting_location,
        hs_meeting_outcome,
      },
    });
  } catch (error) {
    console.error('❌ Create meeting error:', error);
    res.status(500).json({
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
