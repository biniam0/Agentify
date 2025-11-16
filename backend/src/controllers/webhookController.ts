import { Request, Response } from 'express';
import * as barrierxService from '../services/barrierxService';
import { config } from '../config/env';
import { verifyElevenLabsSignature } from '../utils/webhookVerification';

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
