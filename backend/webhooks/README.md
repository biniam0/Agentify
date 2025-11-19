# Webhook Payloads Directory

This directory stores the latest webhook payloads received from ElevenLabs for debugging and monitoring purposes.

## Files

- `elevenlabs-pre-call-latest.json` - The most recent pre-meeting call webhook payload
- `elevenlabs-post-call-latest.json` - The most recent post-meeting call webhook payload
- `elevenlabs-unknown-call-latest.json` - Payloads from unrecognized agent IDs (if any)

## Notes

- Files are automatically overwritten when new webhooks arrive (no accumulation)
- JSON files are excluded from Git (see `.gitignore`) to protect sensitive data
- These files help debug call issues and verify dynamic variables
- Each webhook contains: transcript, analysis, metadata, and call details

## Structure

Each webhook payload typically contains:
```json
{
  "type": "conversation.ended",
  "event_timestamp": 1234567890,
  "data": {
    "conversation_id": "conv_...",
    "agent_id": "agent_...",
    "status": "done",
    "transcript": [...],
    "analysis": {
      "call_successful": "success",
      "transcript_summary": "...",
      "call_summary_title": "..."
    },
    "metadata": {
      "call_duration_secs": 120,
      "termination_reason": "...",
      "phone_call": {
        "external_number": "+1234567890"
      }
    },
    "conversation_initiation_client_data": {
      "dynamic_variables": {...}
    }
  }
}
```

