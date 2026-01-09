/**
 * Call Stats Page
 * Analytics and metrics for calls
 */

import { useState } from 'react';
import { useCallStats } from '@/hooks/useCalls';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, Clock, CheckCircle, XCircle, TrendingUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function CallStatsPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: stats, isLoading } = useCallStats({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overview Stats */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Calls</CardTitle>
              <Phone className="w-4 h-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCalls}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Answered</CardTitle>
              <CheckCircle className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.answeredCalls}</div>
              <p className="text-xs text-gray-500 mt-1">{stats.answerRate}% answer rate</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Missed</CardTitle>
              <XCircle className="w-4 h-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.missedCalls}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Avg Duration</CardTitle>
              <Clock className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.floor(stats.averageDuration / 60)}:{(stats.averageDuration % 60).toString().padStart(2, '0')}
              </div>
              <p className="text-xs text-gray-500 mt-1">minutes</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Calls by Outcome */}
        <Card>
          <CardHeader>
            <CardTitle>Calls by Outcome</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.callsByOutcome && stats.callsByOutcome.length > 0 ? (
              <div className="space-y-3">
                {stats.callsByOutcome.map((item: any) => (
                  <div key={item.callOutcome} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{item.callOutcome || 'Unknown'}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500"
                          style={{
                            width: `${(item._count / stats.totalCalls) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium w-8 text-right">{item._count}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No data available</p>
            )}
          </CardContent>
        </Card>

        {/* Calls by Type */}
        <Card>
          <CardHeader>
            <CardTitle>Calls by Type</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.callsByType && stats.callsByType.length > 0 ? (
              <div className="space-y-3">
                {stats.callsByType.map((item: any) => (
                  <div key={item.callType} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{item.callType} Calls</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500"
                          style={{
                            width: `${(item._count / stats.totalCalls) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium w-8 text-right">{item._count}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No data available</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
