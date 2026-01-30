/**
 * Time helper utilities for meeting filtering
 */

export interface TimeWindow {
  start: number;
  end: number;
}

/**
 * Get time window for T-20 (20 minutes from now)
 * Used for pre-meeting calls
 */
export const getT20Window = (): TimeWindow => {
  const now = Date.now();
  return {
    start: now,
    end: now + 20 * 60 * 1000, // 20 minutes from now
  };
};

/**
 * Get time window for T+18 (18 minutes after meeting ends)
 * Used for post-meeting calls
 * Includes ±3 minute tolerance for scheduler cycles (15-21 min window)
 * Ensures post-calls trigger at minimum 15 minutes after meeting end
 */
export const getT18Window = (): TimeWindow => {
  const now = Date.now();
  return {
    start: now - 21 * 60 * 1000, // 21 minutes ago (18 min + 3 min tolerance)
    end: now - 15 * 60 * 1000,   // 15 minutes ago (18 min - 3 min tolerance)
  };
};

/**
 * Check if a meeting is in the T-20 window (upcoming within 20 minutes)
 */
export const isInT20Window = (startTime: string): boolean => {
  const meetingStart = new Date(startTime).getTime();
  const window = getT20Window();
  return meetingStart >= window.start && meetingStart <= window.end;
};

/**
 * Check if a meeting is in the T+18 window (ended 18 minutes ago, ±3 min tolerance)
 * This checks if meeting ended 15-21 minutes ago
 */
export const isInT18Window = (endTime: string): boolean => {
  const meetingEnd = new Date(endTime).getTime();
  const window = getT18Window();
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
 * Filter meetings based on T-20 and T+18 logic
 * Returns meetings that are either:
 * - Starting within next 20 minutes (T-20)
 * - Ended 18 minutes ago (T+18, with ±3 min tolerance = 15-21 min window)
 * - Currently ongoing
 */
export const filterMeetingsByTimeWindow = <T extends { startTime: string; endTime: string }>(
  meetings: T[]
): T[] => {
  return meetings.filter((meeting) => {
    return (
      isInT20Window(meeting.startTime) ||
      isInT18Window(meeting.endTime) ||
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

