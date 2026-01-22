/**
 * Call Logs Page
 * View and manage all call history with recordings and transcripts
 */

import { useState } from 'react';
import { useCallLogs, useCancelCall, useGenerateCallSummary, usePreviewCallSummary } from '@/hooks/useCalls';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Phone,
  Search,
  Filter,
  Download,
  Play,
  FileText,
  Clock,
  Sparkles,
  XCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  X,
  CalendarCheck,
  CheckCircle2,
  XCircleIcon,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function CallLogsPage() {
  const [page, setPage] = useState(1);
  const [callType, setCallType] = useState<string>('all');
  const [callOutcome, setCallOutcome] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCall, setSelectedCall] = useState<any>(null);
  const [previewSummary, setPreviewSummary] = useState<string | null>(null);

  const { data, isLoading } = useCallLogs({
    callType: callType !== 'all' ? callType : undefined,
    callOutcome: callOutcome !== 'all' ? callOutcome : undefined,
    page,
    limit: 20,
  });

  const cancelCall = useCancelCall();
  const generateSummary = useGenerateCallSummary();
  const previewSummaryMutation = usePreviewCallSummary();

  // Handler to generate preview summary
  const handleGenerateSummary = async () => {
    if (!selectedCall) return;

    try {
      const result = await previewSummaryMutation.mutateAsync(selectedCall.id);
      setPreviewSummary(result.summary);
      toast.success(`Summary generated! Used ${result.metadata.tokensUsed} tokens (~$${result.metadata.estimatedCost.toFixed(6)})`);
    } catch (error) {
      // Error already handled by mutation
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      completed: 'default',
      'in-progress': 'secondary',
      failed: 'destructive',
      'no-answer': 'outline',
      busy: 'outline',
      canceled: 'outline',
    };

    return (
      <Badge variant={variants[status] || 'outline'} className="capitalize">
        {status.replace('-', ' ')}
      </Badge>
    );
  };

  const getOutcomeBadge = (outcome: string) => {
    const colors: Record<string, string> = {
      answered: 'bg-green-100 text-green-800',
      voicemail: 'bg-yellow-100 text-yellow-800',
      'no-answer': 'bg-gray-100 text-gray-800',
      busy: 'bg-orange-100 text-orange-800',
      failed: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[outcome] || 'bg-gray-100 text-gray-800'}`}>
        {outcome?.replace('-', ' ')}
      </span>
    );
  };

  const formatDuration = (seconds: number | null | undefined) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Export call logs to CSV
  const handleExport = () => {
    const params = new URLSearchParams();
    if (callType !== 'all') params.append('callType', callType);
    if (callOutcome !== 'all') params.append('callOutcome', callOutcome);

    // Get auth token from localStorage
    const token = localStorage.getItem('token');

    // Create a temporary link to download the CSV
    const url = `/api/calls/logs/export?${params.toString()}`;
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `call-logs-${new Date().toISOString().split('T')[0]}.csv`);

    // Add authorization header via fetch and create blob URL
    fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(response => response.blob())
      .then(blob => {
        const blobUrl = window.URL.createObjectURL(blob);
        link.href = blobUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
        toast.success('Call logs exported successfully');
      })
      .catch(error => {
        console.error('Export error:', error);
        toast.error('Failed to export call logs');
      });
  };

  // Get recording URL via proxy with token
  const getRecordingUrl = (callId: string) => {
    const token = localStorage.getItem('token');
    return `/api/calls/logs/${callId}/recording?token=${encodeURIComponent(token || '')}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by phone, lead..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={callType} onValueChange={setCallType}>
              <SelectTrigger>
                <SelectValue placeholder="Call Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Calls</SelectItem>
                <SelectItem value="ai">AI Calls</SelectItem>
              </SelectContent>
            </Select>

            <Select value={callOutcome} onValueChange={setCallOutcome}>
              <SelectTrigger>
                <SelectValue placeholder="Outcome" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Outcomes</SelectItem>
                <SelectItem value="answered">Answered</SelectItem>
                <SelectItem value="voicemail">Voicemail</SelectItem>
                <SelectItem value="no-answer">No Answer</SelectItem>
                <SelectItem value="busy">Busy</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Call Logs Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Phone Number</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.callLogs && data.callLogs.length > 0 ? (
                data.callLogs.map((call: any) => (
                  <TableRow key={call.id} className="cursor-pointer hover:bg-gray-50">
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          {format(new Date(call.createdAt), 'MMM dd, yyyy')}
                        </p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(call.createdAt), 'hh:mm a')}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">
                          {call.lead?.name || call.contact?.name || 'Unknown'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {call.lead?.company || call.contact?.company || '-'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {call.phoneNumber}
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">
                        AI
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(call.twilioStatus)}</TableCell>
                    <TableCell>{getOutcomeBadge(call.callOutcome)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-sm">{formatDuration(call.duration)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedCall(call)}
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                        {call.recordingUrl && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(getRecordingUrl(call.id), '_blank')}
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-gray-500">
                      <Phone className="w-12 h-12 text-gray-300" />
                      <p>No calls found</p>
                      <p className="text-sm">Start making calls to see them here</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {data?.pagination && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <p className="text-sm text-gray-600">
                Showing page {data.pagination.page} of {data.pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= data.pagination.totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Call Details Dialog */}
      {selectedCall && (
        <Dialog open={!!selectedCall} onOpenChange={(open) => {
          if (!open) {
            setSelectedCall(null);
            setPreviewSummary(null);
          }
        }}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Call Details</DialogTitle>
              <DialogDescription>
                {format(new Date(selectedCall.createdAt), 'MMM dd, yyyy hh:mm a')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Call Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Contact</p>
                  <p className="font-medium">
                    {selectedCall.lead?.name || selectedCall.contact?.name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone Number</p>
                  <p className="font-mono">{selectedCall.phoneNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  <Badge variant="default">
                    AI Call
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Duration</p>
                  <p>{formatDuration(selectedCall.duration)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  {getStatusBadge(selectedCall.twilioStatus)}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Outcome</p>
                  {getOutcomeBadge(selectedCall.callOutcome)}
                </div>
              </div>

              {/* Recording */}
              {selectedCall.recordingUrl && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Recording</p>
                  <audio controls className="w-full" src={getRecordingUrl(selectedCall.id)}>
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}

              {/* Transcript */}
              {selectedCall.transcript && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Transcript</p>
                  <div className="bg-gray-50 p-4 rounded-lg text-sm">
                    {selectedCall.transcript}
                  </div>
                </div>
              )}

              {/* Summary Section */}
              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-500" />
                  AI Summary
                </p>

                {/* Show existing saved summary */}
                {selectedCall.summary && !previewSummary && (
                  <div className="bg-blue-50 p-4 rounded-lg text-sm border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-blue-600 font-medium">Saved Summary</span>
                    </div>
                    <div className="whitespace-pre-wrap">{selectedCall.summary}</div>
                  </div>
                )}

                {/* Show preview summary */}
                {previewSummary && (
                  <div className="bg-green-50 p-4 rounded-lg text-sm border border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-green-600 font-medium">AI Generated Summary (Preview)</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setPreviewSummary(null)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="whitespace-pre-wrap">{previewSummary}</div>
                  </div>
                )}

                {/* Generate button - show only if transcript exists and no preview yet */}
                {selectedCall.transcript && !previewSummary && (
                  <Button
                    onClick={handleGenerateSummary}
                    disabled={previewSummaryMutation.isPending}
                    variant="outline"
                    className="w-full"
                  >
                    {previewSummaryMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating AI Summary...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate AI Summary
                      </>
                    )}
                  </Button>
                )}

                {/* No transcript available */}
                {!selectedCall.transcript && !selectedCall.summary && (
                  <p className="text-sm text-gray-500 italic">
                    No transcript available. Transcription occurs after call completion.
                  </p>
                )}
              </div>

              {/* Sentiment */}
              {selectedCall.sentiment && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Sentiment</p>
                  <Badge
                    variant={
                      selectedCall.sentiment === 'positive'
                        ? 'default'
                        : selectedCall.sentiment === 'negative'
                        ? 'destructive'
                        : 'secondary'
                    }
                    className="capitalize"
                  >
                    {selectedCall.sentiment}
                  </Badge>
                </div>
              )}

              {/* Demo/Meeting Scheduling (PRO Feature) */}
              {selectedCall.meetingExtracted && (
                <div className="space-y-3 border-t pt-4">
                  <div className="flex items-center gap-2">
                    <CalendarCheck className="w-4 h-4 text-purple-600" />
                    <p className="text-sm font-medium">
                      Demo Scheduling
                      <span className="ml-2 text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                        AI EXTRACTED
                      </span>
                    </p>
                  </div>

                  {selectedCall.hasMeetingRequest ? (
                    <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-200 space-y-3">
                      {/* Meeting Agreement Status */}
                      <div className="flex items-center gap-2">
                        {selectedCall.meetingAgreed ? (
                          <>
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                            <span className="font-medium text-green-700">Lead Agreed to Demo</span>
                          </>
                        ) : (
                          <>
                            <XCircleIcon className="w-5 h-5 text-red-600" />
                            <span className="font-medium text-red-700">Demo Not Agreed</span>
                          </>
                        )}
                      </div>

                      {/* Meeting Details */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {selectedCall.meetingType && (
                          <div>
                            <p className="text-gray-500">Type</p>
                            <Badge variant="outline" className="capitalize">
                              {selectedCall.meetingType}
                            </Badge>
                          </div>
                        )}

                        {selectedCall.meetingConfidence && (
                          <div>
                            <p className="text-gray-500">AI Confidence</p>
                            <p className="font-medium">{selectedCall.meetingConfidence}%</p>
                          </div>
                        )}

                        {selectedCall.meetingProposedDate && (
                          <div>
                            <p className="text-gray-500">Proposed Date</p>
                            <p className="font-medium">
                              {format(new Date(selectedCall.meetingProposedDate), 'MMM dd, yyyy')}
                            </p>
                          </div>
                        )}

                        {selectedCall.meetingProposedTime && (
                          <div>
                            <p className="text-gray-500">Proposed Time</p>
                            <p className="font-medium">{selectedCall.meetingProposedTime}</p>
                          </div>
                        )}

                        {selectedCall.meetingDuration && (
                          <div>
                            <p className="text-gray-500">Duration</p>
                            <p className="font-medium">{selectedCall.meetingDuration} minutes</p>
                          </div>
                        )}
                      </div>

                      {/* Original Text from Transcript */}
                      {selectedCall.meetingDateTimeText && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">From Transcript:</p>
                          <p className="text-sm italic bg-white/50 p-2 rounded">
                            "{selectedCall.meetingDateTimeText}"
                          </p>
                        </div>
                      )}

                      {/* Meeting Notes */}
                      {selectedCall.meetingNotes && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Notes:</p>
                          <p className="text-sm bg-white/50 p-2 rounded">
                            {selectedCall.meetingNotes}
                          </p>
                        </div>
                      )}

                      {/* Lead Preferences */}
                      {selectedCall.meetingPreferences && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Preferences:</p>
                          <p className="text-sm bg-white/50 p-2 rounded">
                            {selectedCall.meetingPreferences}
                          </p>
                        </div>
                      )}

                      {/* Calendar Event Link */}
                      {selectedCall.meetingCalendarEventId && (
                        <div className="pt-2 border-t border-purple-200">
                          <Badge variant="default" className="bg-green-600">
                            <CalendarCheck className="w-3 h-3 mr-1" />
                            Calendar Event Created
                          </Badge>
                        </div>
                      )}

                      {/* Reason for Decline */}
                      {!selectedCall.meetingAgreed && selectedCall.meetingReasonDeclined && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Reason for Decline:</p>
                          <p className="text-sm bg-red-50 p-2 rounded text-red-800">
                            {selectedCall.meetingReasonDeclined}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600">
                      No demo or meeting request detected in this call.
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                {['queued', 'ringing', 'in-progress'].includes(selectedCall.twilioStatus) && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => cancelCall.mutate(selectedCall.id)}
                    disabled={cancelCall.isPending}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancel Call
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCall(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
