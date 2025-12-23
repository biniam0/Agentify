/**
 * Formatters for Call Continuation Feature
 * Helper functions to format BarrierX engagement data for AI agent consumption
 */

/**
 * Format recent notes into readable summary for AI agent
 * @param notes - Array of note engagements from BarrierX
 * @returns Formatted string with recent notes
 */
export function formatRecentNotes(notes: any[]): string {
  if (!notes || notes.length === 0) {
    return 'No recent notes available';
  }

  return notes
    .map((note, index) => {
      const date = new Date(note.loggedAt).toLocaleDateString();
      const content = note.content?.substring(0, 150) || note.subject || 'No content';
      // Clean up content - remove excessive whitespace
      const cleanContent = content.replace(/\s+/g, ' ').trim();
      return `${index + 1}. [${date}] ${cleanContent}`;
    })
    .join('\n');
}

/**
 * Format tasks into readable list
 * @param tasks - Array of task engagements from BarrierX
 * @returns Formatted string with task list
 */
export function formatTasks(tasks: any[]): string {
  if (!tasks || tasks.length === 0) {
    return 'No tasks available';
  }

  return tasks
    .map((task, index) => {
      const subject = task.subject || 'Untitled task';
      const dueDate = task.dueDate 
        ? `(Due: ${new Date(task.dueDate).toLocaleDateString()})`
        : '';
      return `${index + 1}. ${subject} ${dueDate}`.trim();
    })
    .join('\n');
}

/**
 * Count open (not completed) tasks
 * @param tasks - Array of task engagements
 * @returns Number of open tasks
 */
export function countOpenTasks(tasks: any[]): number {
  if (!tasks || tasks.length === 0) {
    return 0;
  }

  return tasks.filter(task => {
    const subject = (task.subject || '').toLowerCase();
    const content = (task.content || '').toLowerCase();
    // Task is considered closed if subject or content contains "complet"
    return !subject.includes('complet') && !content.includes('complet');
  }).length;
}

/**
 * Format recent meetings into readable list
 * @param meetings - Array of meeting engagements
 * @returns Formatted string with meeting list
 */
export function formatRecentMeetings(meetings: any[]): string {
  if (!meetings || meetings.length === 0) {
    return 'No recent meetings';
  }

  return meetings
    .map((meeting, index) => {
      const date = new Date(meeting.loggedAt).toLocaleDateString();
      const subject = meeting.subject || 'Untitled meeting';
      return `${index + 1}. [${date}] ${subject}`;
    })
    .join('\n');
}

/**
 * Detect if a call was actually a voicemail
 * @param transcriptSummary - The call transcript summary
 * @param webhookData - The webhook data from ElevenLabs
 * @param callDuration - Duration of call in seconds
 * @returns True if voicemail was detected
 */
export function isVoicemailCall(
  transcriptSummary: string | null,
  webhookData: any,
  callDuration: number
): boolean {
  // 🔥 MOST RELIABLE: Check ElevenLabs termination_reason
  const terminationReason = (webhookData?.metadata?.termination_reason || '').toLowerCase();
  if (terminationReason.includes('voicemail_detection') || terminationReason.includes('voicemail detection')) {
    return true;
  }

  // Also check features_usage for voicemail detection
  const voicemailDetectionUsed = webhookData?.metadata?.features_usage?.voicemail_detection?.used;
  if (voicemailDetectionUsed === true) {
    return true;
  }

  // Fallback: Check transcript for voicemail keywords
  const transcript = (transcriptSummary || '').toLowerCase();
  const voicemailKeywords = [
    'voicemail',
    'leave a message',
    'record your message',
    'na de toon', // Dutch: "after the tone"
    'laat een bericht', // Dutch: "leave a message"
    'opname is mislukt', // Dutch: "recording failed"
    'recording failed',
    'after the tone',
    'beep',
    'leave message',
    'not available',
    'automated greeting detected', // From ElevenLabs voicemail detection
  ];
  
  const hasVoicemailKeyword = voicemailKeywords.some(keyword => 
    transcript.includes(keyword)
  );
  
  // Very short call with "remote party" termination (last resort)
  const isShortRemoteTermination = 
    callDuration < 45 && 
    terminationReason.includes('remote');
  
  return hasVoicemailKeyword || isShortRemoteTermination;
}

/**
 * Calculate time elapsed since a date
 * @param date - The date to calculate from
 * @returns Human-readable time elapsed string
 */
export function getTimeElapsed(date: Date): string {
  const timeDiff = Date.now() - date.getTime();
  const hoursAgo = Math.floor(timeDiff / (1000 * 60 * 60));
  const minutesAgo = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
  const daysAgo = Math.floor(hoursAgo / 24);
  
  if (daysAgo > 0) {
    return `${daysAgo} day${daysAgo > 1 ? 's' : ''} ago`;
  } else if (hoursAgo > 0) {
    return `${hoursAgo} hour${hoursAgo > 1 ? 's' : ''} ${minutesAgo} minute${minutesAgo > 1 ? 's' : ''} ago`;
  } else {
    return `${minutesAgo} minute${minutesAgo > 1 ? 's' : ''} ago`;
  }
}

