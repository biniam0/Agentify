/**
 * Time helper utilities for meeting filtering
 */

export interface TimeWindow {
  start: number;
  end: number;
}

/**
 * Get time window for T-15 (15 minutes from now)
 * Used for pre-meeting calls
 */
export const getT15Window = (): TimeWindow => {
  const now = Date.now();
  return {
    start: now,
    end: now + 15 * 60 * 1000, // 15 minutes from now
  };
};

/**
 * Get time window for T+30 (30 minutes ago)
 * Used for post-meeting calls
 */
export const getT30Window = (): TimeWindow => {
  const now = Date.now();
  return {
    start: now - 30 * 60 * 1000, // 30 minutes ago
    end: now,
  };
};

/**
 * Check if a meeting is in the T-15 window (upcoming within 15 minutes)
 */
export const isInT15Window = (startTime: string): boolean => {
  const meetingStart = new Date(startTime).getTime();
  const window = getT15Window();
  return meetingStart >= window.start && meetingStart <= window.end;
};

/**
 * Check if a meeting is in the T+30 window (ended within last 30 minutes)
 */
export const isInT30Window = (endTime: string): boolean => {
  const meetingEnd = new Date(endTime).getTime();
  const window = getT30Window();
  return meetingEnd >= window.start && meetingEnd <= window.end;
};

/**
 * Check if a meeting is currently ongoing
 */
export const isMeetingOngoing = (startTime: string, endTime: string): boolean => {
  const now = Date.now();
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  return start <= now && end >= now;
};

/**
 * Filter meetings based on T-15 and T+30 logic
 * Returns meetings that are either:
 * - Starting within next 15 minutes (T-15)
 * - Ended within last 30 minutes (T+30)
 * - Currently ongoing
 */
export const filterMeetingsByTimeWindow = <T extends { startTime: string; endTime: string }>(
  meetings: T[]
): T[] => {
  return meetings.filter((meeting) => {
    return (
      isInT15Window(meeting.startTime) ||
      isInT30Window(meeting.endTime) ||
      isMeetingOngoing(meeting.startTime, meeting.endTime)
    );
  });
};

/**
 * Get human-readable description of time until/since meeting
 */
export const getTimeDescription = (startTime: string): string => {
  const now = Date.now();
  const start = new Date(startTime).getTime();
  const diff = start - now;
  const minutes = Math.abs(Math.floor(diff / 60000));
  
  if (diff > 0) {
    return `Starts in ${minutes} minute${minutes !== 1 ? 's' : ''}`;
  } else {
    return `Started ${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  }
};

