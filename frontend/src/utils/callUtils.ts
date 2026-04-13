/**
 * Call Utilities - Helper functions for call-related operations
 */

/**
 * Detect if a call was actually a voicemail based on webhook data
 * Ported from backend/src/utils/formatters.ts
 * 
 * @param webhookData - The webhook data stored in the call log
 * @param transcriptSummary - The call transcript summary (optional fallback)
 * @returns True if voicemail was detected
 */
export function isVoicemailCall(
  webhookData: any,
  transcriptSummary?: string | null
): boolean {
  if (!webhookData) return false;

  // Handle both direct webhook data and nested data structure
  const data = webhookData?.data || webhookData;
  const metadata = data?.metadata;

  // 1. MOST RELIABLE: Check ElevenLabs features_usage for voicemail detection
  const voicemailDetectionUsed = metadata?.features_usage?.voicemail_detection?.used;
  if (voicemailDetectionUsed === true) {
    return true;
  }

  // 2. Check ElevenLabs termination_reason
  const terminationReason = (metadata?.termination_reason || '').toLowerCase();
  if (
    terminationReason.includes('voicemail_detection') ||
    terminationReason.includes('voicemail detection')
  ) {
    return true;
  }

  // 3. Check transcript for voicemail_detection tool call
  const transcript = data?.transcript || [];
  const hasVoicemailToolCall = transcript.some((entry: any) =>
    entry.tool_calls?.some((tc: any) => tc.tool_name === 'voicemail_detection') ||
    entry.tool_results?.some((tr: any) => tr.tool_name === 'voicemail_detection')
  );
  if (hasVoicemailToolCall) {
    return true;
  }

  // 4. Fallback: Check transcript summary for voicemail keywords
  const summary = (transcriptSummary || data?.analysis?.transcript_summary || '').toLowerCase();
  const voicemailKeywords = [
    'voicemail',
    'leave a message',
    'record your message',
    'na de toon', // Dutch: "after the tone"
    'laat een bericht', // Dutch: "leave a message"
    'opname is mislukt', // Dutch: "recording failed"
    'recording failed',
    'after the tone',
    'leave message',
    'automated greeting detected',
  ];

  const hasVoicemailKeyword = voicemailKeywords.some((keyword) =>
    summary.includes(keyword)
  );

  if (hasVoicemailKeyword) {
    return true;
  }

  // 5. Check analysis title for voicemail mention
  const callSummaryTitle = (data?.analysis?.call_summary_title || '').toLowerCase();
  if (callSummaryTitle.includes('voicemail')) {
    return true;
  }

  return false;
}

/**
 * Format call duration in human-readable format
 * @param seconds - Duration in seconds
 * @returns Formatted duration string
 */
export function formatDuration(seconds?: number): string {
  if (!seconds) return 'N/A';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}
