/**
 * React Query hooks for AI Calls
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCallSettings,
  updateCallSettings,
  getCallScripts,
  getCallScript,
  createCallScript,
  updateCallScript,
  deleteCallScript,
  getCallLogs,
  getCallLog,
  cancelCall,
  generateCallSummary,
  initiateCall,
  getCallQueue,
  retryQueueItem,
  cancelQueueItem,
  getCallStats,
  CallSettings,
  CallScript,
  CallLog,
  CallQueueItem,
  CallStats,
} from '@/lib/calls-api';
import { toast } from '@/hooks/use-toast';

// ==========================================
// CALL SETTINGS HOOKS
// ==========================================

export function useCallSettings() {
  return useQuery({
    queryKey: ['callSettings'],
    queryFn: async () => {
      try {
        const data = await getCallSettings();
        return data.settings;
      } catch (error) {
        console.error('Error fetching call settings:', error);
        return null;
      }
    },
    retry: false,
    staleTime: 30000,
  });
}

export function useUpdateCallSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<CallSettings>) => updateCallSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callSettings'] });
      toast({
        title: 'Settings Updated',
        description: 'Call settings have been updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update call settings',
        variant: 'destructive',
      });
    },
  });
}

// ==========================================
// CALL SCRIPTS HOOKS
// ==========================================

export function useCallScripts(params?: { scriptType?: string; isActive?: boolean }) {
  return useQuery({
    queryKey: ['callScripts', params],
    queryFn: async () => {
      try {
        const data = await getCallScripts(params);
        return data.scripts;
      } catch (error) {
        console.error('Error fetching call scripts:', error);
        return [];
      }
    },
    retry: false,
    staleTime: 30000,
  });
}

export function useCallScript(id: string | undefined) {
  return useQuery({
    queryKey: ['callScript', id],
    queryFn: async () => {
      if (!id) return null;
      const data = await getCallScript(id);
      return data.script;
    },
    enabled: !!id,
  });
}

export function useCreateCallScript() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: FormData) => createCallScript(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callScripts'] });
      toast({
        title: 'Script Created',
        description: 'Call script has been created successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create call script',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateCallScript() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) =>
      updateCallScript(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callScripts'] });
      queryClient.invalidateQueries({ queryKey: ['callScript'] });
      toast({
        title: 'Script Updated',
        description: 'Call script has been updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update call script',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteCallScript() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCallScript(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callScripts'] });
      toast({
        title: 'Script Deleted',
        description: 'Call script has been deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete call script',
        variant: 'destructive',
      });
    },
  });
}

// ==========================================
// CALL LOGS HOOKS
// ==========================================

export function useCallLogs(params?: {
  leadId?: string;
  contactId?: string;
  callType?: string;
  callOutcome?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['callLogs', params],
    queryFn: () => getCallLogs(params),
  });
}

export function useCallLog(id: string | undefined) {
  return useQuery({
    queryKey: ['callLog', id],
    queryFn: async () => {
      if (!id) return null;
      const data = await getCallLog(id);
      return data.callLog;
    },
    enabled: !!id,
  });
}

export function useCancelCall() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cancelCall(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callLogs'] });
      queryClient.invalidateQueries({ queryKey: ['callLog'] });
      toast({
        title: 'Call Cancelled',
        description: 'The call has been cancelled successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel call',
        variant: 'destructive',
      });
    },
  });
}

export function useGenerateCallSummary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => generateCallSummary(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callLogs'] });
      queryClient.invalidateQueries({ queryKey: ['callLog'] });
      toast({
        title: 'Summary Generated',
        description: 'AI summary has been generated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate summary',
        variant: 'destructive',
      });
    },
  });
}

// ==========================================
// CALL INITIATION HOOKS
// ==========================================

export function useInitiateCall() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      leadId?: string;
      contactId?: string;
      phoneNumber?: string;
      phoneCountryCode?: string;
      callType?: 'ai' | 'manual';
      callScriptId?: string;
      priority?: number;
      scheduledFor?: string;
    }) => initiateCall(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callQueue'] });
      toast({
        title: 'Call Initiated',
        description: 'Call has been queued successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to initiate call',
        variant: 'destructive',
      });
    },
  });
}

// ==========================================
// CALL QUEUE HOOKS
// ==========================================

export function useCallQueue(params?: {
  status?: string;
  leadId?: string;
  callType?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['callQueue', params],
    queryFn: () => getCallQueue(params),
    refetchInterval: 10000, // Refetch every 10 seconds for real-time updates
  });
}

export function useRetryQueueItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => retryQueueItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callQueue'] });
      toast({
        title: 'Call Queued for Retry',
        description: 'The call has been queued for retry',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to retry call',
        variant: 'destructive',
      });
    },
  });
}

export function useCancelQueueItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cancelQueueItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callQueue'] });
      toast({
        title: 'Call Cancelled',
        description: 'The queued call has been cancelled',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel call',
        variant: 'destructive',
      });
    },
  });
}

// ==========================================
// CALL STATS HOOKS
// ==========================================

export function useCallStats(params?: {
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: ['callStats', params],
    queryFn: () => getCallStats(params),
  });
}
