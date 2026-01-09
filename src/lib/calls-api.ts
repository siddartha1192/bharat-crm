/**
 * AI Calls API
 * API functions for managing AI and manual calls
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Generic fetch wrapper
async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('token');
  const isFormData = options?.body instanceof FormData;

  const headers: HeadersInit = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...options?.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      localStorage.removeItem('user');
      window.location.href = '/login';
      throw new Error('Session expired. Please login again.');
    }

    const error = await response.json().catch(() => ({ error: 'An error occurred' }));
    throw new Error(error.error || error.message || `HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

// ==========================================
// TYPES
// ==========================================

export interface CallSettings {
  id: string;
  tenantId: string;
  twilioAccountSid: string | null;
  twilioAuthToken: string | null;
  twilioPhoneNumber: string | null;
  openaiApiKey: string | null;
  openaiModel: string;
  maxConcurrentCalls: number;
  callTimeout: number;
  enableRecording: boolean;
  enableTranscription: boolean;
  autoCallOnLeadCreate: boolean;
  autoCallOnStageChange: boolean;
  autoCallDelaySeconds: number;
  enableBusinessHours: boolean;
  businessHoursStart: string | null;
  businessHoursEnd: string | null;
  businessDays: string[] | null;
  timezone: string;
  defaultCallScriptId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CallScript {
  id: string;
  name: string;
  description?: string;
  scriptType: 'ai' | 'manual' | 'hybrid';
  aiGreeting?: string;
  aiObjective?: string;
  aiInstructions?: string;
  aiPersonality?: 'professional' | 'friendly' | 'casual' | 'formal';
  documentFileName?: string;
  documentFilePath?: string;
  documentFileSize?: number;
  documentMimeType?: string;
  manualScript?: string;
  isActive: boolean;
  isDefault: boolean;
  usageCount: number;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
  tenantId: string;
  userId: string;
}

export interface CallLog {
  id: string;
  tenantId: string;
  leadId?: string;
  contactId?: string;
  phoneNumber: string;
  phoneCountryCode: string;
  direction: 'outbound' | 'inbound';
  callType: 'ai' | 'manual';
  twilioCallSid: string;
  twilioStatus: string;
  twilioErrorCode?: string;
  twilioErrorMessage?: string;
  duration?: number;
  startedAt?: string;
  endedAt?: string;
  answeredAt?: string;
  transcript?: string;
  summary?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  aiModelUsed?: string;
  aiTokensUsed?: number;
  aiCost?: number;
  callScriptId?: string;
  recordingUrl?: string;
  recordingSid?: string;
  recordingDuration?: number;
  triggerType: string;
  automationRuleId?: string;
  callOutcome?: string;
  nextActionNeeded?: string;
  notes?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  lead?: any;
  contact?: any;
  callScript?: any;
  createdBy?: any;
}

export interface CallQueueItem {
  id: string;
  tenantId: string;
  leadId?: string;
  contactId?: string;
  phoneNumber: string;
  phoneCountryCode: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  priority: number;
  callType: 'ai' | 'manual';
  callScriptId?: string;
  triggerType: string;
  triggerData?: any;
  automationRuleId?: string;
  attempts: number;
  maxAttempts: number;
  lastAttemptAt?: string;
  nextRetryAt?: string;
  callLogId?: string;
  errorMessage?: string;
  scheduledFor?: string;
  metadata?: any;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  lead?: any;
  contact?: any;
  callLog?: any;
  createdBy?: any;
}

export interface CallStats {
  totalCalls: number;
  answeredCalls: number;
  missedCalls: number;
  answerRate: string;
  averageDuration: number;
  callsByOutcome: Array<{ callOutcome: string; _count: number }>;
  callsByType: Array<{ callType: string; _count: number }>;
}

// ==========================================
// CALL SETTINGS
// ==========================================

export async function getCallSettings(): Promise<{ settings: CallSettings }> {
  return fetchAPI('/calls/settings');
}

export async function updateCallSettings(data: Partial<CallSettings>): Promise<{ success: boolean; message: string; settings: CallSettings }> {
  return fetchAPI('/calls/settings', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ==========================================
// CALL SCRIPTS
// ==========================================

export async function getCallScripts(params?: { scriptType?: string; isActive?: boolean }): Promise<{ scripts: CallScript[] }> {
  const queryParams = new URLSearchParams();
  if (params?.scriptType) queryParams.append('scriptType', params.scriptType);
  if (params?.isActive !== undefined) queryParams.append('isActive', String(params.isActive));

  const query = queryParams.toString();
  return fetchAPI(`/calls/scripts${query ? `?${query}` : ''}`);
}

export async function getCallScript(id: string): Promise<{ script: CallScript }> {
  return fetchAPI(`/calls/scripts/${id}`);
}

export async function createCallScript(data: FormData): Promise<{ success: boolean; message: string; script: CallScript }> {
  return fetchAPI('/calls/scripts', {
    method: 'POST',
    body: data,
  });
}

export async function updateCallScript(id: string, data: FormData): Promise<{ success: boolean; message: string; script: CallScript }> {
  return fetchAPI(`/calls/scripts/${id}`, {
    method: 'PUT',
    body: data,
  });
}

export async function deleteCallScript(id: string): Promise<{ success: boolean; message: string }> {
  return fetchAPI(`/calls/scripts/${id}`, {
    method: 'DELETE',
  });
}

// ==========================================
// CALL LOGS
// ==========================================

export async function getCallLogs(params?: {
  leadId?: string;
  contactId?: string;
  callType?: string;
  callOutcome?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}): Promise<{
  callLogs: CallLog[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}> {
  const queryParams = new URLSearchParams();
  if (params?.leadId) queryParams.append('leadId', params.leadId);
  if (params?.contactId) queryParams.append('contactId', params.contactId);
  if (params?.callType) queryParams.append('callType', params.callType);
  if (params?.callOutcome) queryParams.append('callOutcome', params.callOutcome);
  if (params?.startDate) queryParams.append('startDate', params.startDate);
  if (params?.endDate) queryParams.append('endDate', params.endDate);
  if (params?.page) queryParams.append('page', String(params.page));
  if (params?.limit) queryParams.append('limit', String(params.limit));

  const query = queryParams.toString();
  return fetchAPI(`/calls/logs${query ? `?${query}` : ''}`);
}

export async function getCallLog(id: string): Promise<{ callLog: CallLog }> {
  return fetchAPI(`/calls/logs/${id}`);
}

export async function cancelCall(id: string): Promise<{ success: boolean; message: string; callLog: CallLog }> {
  return fetchAPI(`/calls/logs/${id}/cancel`, {
    method: 'POST',
  });
}

export async function generateCallSummary(id: string): Promise<{ success: boolean; summary: string; callLog: CallLog }> {
  return fetchAPI(`/calls/logs/${id}/generate-summary`, {
    method: 'POST',
  });
}

// ==========================================
// CALL INITIATION
// ==========================================

export async function initiateCall(data: {
  leadId?: string;
  contactId?: string;
  phoneNumber?: string;
  phoneCountryCode?: string;
  callType?: 'ai' | 'manual';
  callScriptId?: string;
  priority?: number;
  scheduledFor?: string;
}): Promise<{ success: boolean; message: string; queueItem: CallQueueItem }> {
  return fetchAPI('/calls/initiate', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ==========================================
// CALL QUEUE
// ==========================================

export async function getCallQueue(params?: {
  status?: string;
  leadId?: string;
  callType?: string;
  page?: number;
  limit?: number;
}): Promise<{
  queueItems: CallQueueItem[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
  status: {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    scheduledCalls: number;
    dueCalls: number;
  };
}> {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.leadId) queryParams.append('leadId', params.leadId);
  if (params?.callType) queryParams.append('callType', params.callType);
  if (params?.page) queryParams.append('page', String(params.page));
  if (params?.limit) queryParams.append('limit', String(params.limit));

  const query = queryParams.toString();
  return fetchAPI(`/calls/queue${query ? `?${query}` : ''}`);
}

export async function retryQueueItem(id: string): Promise<{ success: boolean; message: string; queueItem: CallQueueItem }> {
  return fetchAPI(`/calls/queue/${id}/retry`, {
    method: 'POST',
  });
}

export async function cancelQueueItem(id: string): Promise<{ success: boolean; message: string; queueItem: CallQueueItem }> {
  return fetchAPI(`/calls/queue/${id}`, {
    method: 'DELETE',
  });
}

// ==========================================
// CALL STATS
// ==========================================

export async function getCallStats(params?: {
  startDate?: string;
  endDate?: string;
}): Promise<CallStats> {
  const queryParams = new URLSearchParams();
  if (params?.startDate) queryParams.append('startDate', params.startDate);
  if (params?.endDate) queryParams.append('endDate', params.endDate);

  const query = queryParams.toString();
  return fetchAPI(`/calls/stats${query ? `?${query}` : ''}`);
}
