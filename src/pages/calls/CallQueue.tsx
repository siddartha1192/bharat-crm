/**
 * Call Queue Page
 * Monitor and manage pending/scheduled calls
 */

import { useState } from 'react';
import { useCallQueue, useRetryQueueItem, useCancelQueueItem } from '@/hooks/useCalls';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, X, Clock, Loader2, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function CallQueuePage() {
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const { data, isLoading, refetch } = useCallQueue({ status: statusFilter !== 'all' ? statusFilter : undefined });
  const retryQueue = useRetryQueueItem();
  const cancelQueue = useCancelQueueItem();

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', icon: any }> = {
      pending: { variant: 'outline', icon: Clock },
      processing: { variant: 'secondary', icon: Loader2 },
      completed: { variant: 'default', icon: CheckCircle },
      failed: { variant: 'destructive', icon: AlertCircle },
      cancelled: { variant: 'outline', icon: XCircle },
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="w-3 h-3" />
        {status}
      </Badge>
    );
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
      {/* Stats Cards */}
      {data?.status && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.status.pending}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Processing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.status.processing}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{data.status.completed}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Failed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{data.status.failed}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Queue Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Scheduled For</TableHead>
                <TableHead>Attempts</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.queueItems && data.queueItems.length > 0 ? (
                data.queueItems.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">
                          {item.lead?.name || item.contact?.name || 'Unknown'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {item.lead?.company || item.contact?.company || '-'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{item.phoneNumber}</TableCell>
                    <TableCell>
                      <Badge variant={item.callType === 'ai' ? 'default' : 'secondary'}>
                        {item.callType}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: item.priority }).map((_, i) => (
                          <div
                            key={i}
                            className="w-2 h-2 rounded-full bg-blue-500"
                          />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.scheduledFor ? (
                        <div className="space-y-1">
                          <p className="text-sm">{format(new Date(item.scheduledFor), 'MMM dd')}</p>
                          <p className="text-xs text-gray-500">
                            {format(new Date(item.scheduledFor), 'hh:mm a')}
                          </p>
                        </div>
                      ) : (
                        <span className="text-gray-400">Immediate</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {item.attempts}/{item.maxAttempts}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {item.status === 'failed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => retryQueue.mutate(item.id)}
                            disabled={retryQueue.isPending}
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                        )}
                        {(item.status === 'pending' || item.status === 'failed') && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => cancelQueue.mutate(item.id)}
                            disabled={cancelQueue.isPending}
                          >
                            <X className="w-4 h-4" />
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
                      <Clock className="w-12 h-12 text-gray-300" />
                      <p>No items in queue</p>
                      <p className="text-sm">Calls will appear here when queued</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
