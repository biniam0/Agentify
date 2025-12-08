import api from './api';
import { MeetingsResponse, CallTriggerResponse } from '../types';

export const getMeetings = async (): Promise<MeetingsResponse> => {
  const response = await api.get<MeetingsResponse>('/meetings');
  return response.data;
};

export const getAdminMeetings = async (): Promise<MeetingsResponse> => {
  const response = await api.get<MeetingsResponse>('/meetings/admin');
  return response.data;
};

export const triggerPreCall = async (
  meetingId: string,
  dealId: string
): Promise<CallTriggerResponse> => {
  const response = await api.post<CallTriggerResponse>('/meetings/trigger/pre-call', {
    meetingId,
    dealId,
  });
  return response.data;
};

export const triggerPostCall = async (
  meetingId: string,
  dealId: string
): Promise<CallTriggerResponse> => {
  const response = await api.post<CallTriggerResponse>('/meetings/trigger/post-call', {
    meetingId,
    dealId,
  });
  return response.data;
};

// Admin trigger functions - send complete data
export const adminTriggerPreCall = async (
  meeting: any,
  deal: any
): Promise<CallTriggerResponse> => {
  const response = await api.post<CallTriggerResponse>('/meetings/admin/trigger/pre-call', {
    meeting,
    deal,
  });
  return response.data;
};

export const adminTriggerPostCall = async (
  meeting: any,
  deal: any
): Promise<CallTriggerResponse> => {
  const response = await api.post<CallTriggerResponse>('/meetings/admin/trigger/post-call', {
    meeting,
    deal,
  });
  return response.data;
};

