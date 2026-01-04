import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Users,
  RefreshCw,
  Eye,
  TrendingUp,
  Clock,
  UserCheck,
  Settings,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface RoundRobinConfig {
  isEnabled: boolean;
  assignmentScope: 'all' | 'team' | 'department' | 'custom';
  teamId: string | null;
  departmentId: string | null;
  customUserIds: string[];
  workingHours: WorkingHours | null;
  timezone: string;
  maxLeadsPerDay: number | null;
  maxLeadsPerWeek: number | null;
  fallbackToCreator: boolean;
  fallbackUserId: string | null;
  skipInactiveUsers: boolean;
  skipFullAgents: boolean;
}

interface WorkingHours {
  [key: string]: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Team {
  id: string;
  name: string;
}

interface Department {
  id: string;
  name: string;
}

interface RoundRobinState {
  initialized: boolean;
  lastAssignedUserName?: string;
  lastAssignedAt?: string;
  assignmentCount?: number;
  rotationCycle?: number;
  userPool?: User[];
}

interface Statistics {
  total: number;
  byUser: {
    userId: string;
    userName: string;
    count: number;
    reasons: { [key: string]: number };
  }[];
  byReason: { [key: string]: number };
}

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

export default function RoundRobinSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<RoundRobinConfig>({
    isEnabled: false,
    assignmentScope: 'all',
    teamId: null,
    departmentId: null,
    customUserIds: [],
    workingHours: null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    maxLeadsPerDay: null,
    maxLeadsPerWeek: null,
    fallbackToCreator: true,
    fallbackUserId: null,
    skipInactiveUsers: true,
    skipFullAgents: true,
  });
  const [state, setState] = useState<RoundRobinState | null>(null);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };

      // Load configuration, state, users, teams, and departments in parallel
      const [configRes, stateRes, usersRes, teamsRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/round-robin/config`, { headers }),
        fetch(`${API_URL}/api/round-robin/state`, { headers }),
        fetch(`${API_URL}/api/users/assignable`, { headers }),
        fetch(`${API_URL}/api/teams`, { headers }),
        fetch(`${API_URL}/api/round-robin/statistics?period=30d`, { headers }),
      ]);

      if (configRes.ok) {
        const configData = await configRes.json();
        setConfig(configData);
        setSelectedUsers(configData.customUserIds || []);
      }

      if (stateRes.ok) {
        const stateData = await stateRes.json();
        setState(stateData);
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData);
      }

      if (teamsRes.ok) {
        const teamsData = await teamsRes.json();
        setTeams(teamsData.teams || []);
        setDepartments(teamsData.departments || []);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStatistics(statsData.statistics);
      }
    } catch (error) {
      console.error('Error loading round-robin data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load round-robin settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/round-robin/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...config,
          customUserIds: selectedUsers,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save configuration');
      }

      const data = await response.json();
      setConfig(data.config);

      toast({
        title: 'Success',
        description: 'Round-robin configuration saved successfully',
      });

      // Reload state after saving
      loadData();
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast({
        title: 'Error',
        description: 'Failed to save configuration',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const resetRotation = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/round-robin/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to reset rotation');
      }

      toast({
        title: 'Success',
        description: 'Round-robin rotation reset successfully',
      });

      loadData();
    } catch (error) {
      console.error('Error resetting rotation:', error);
      toast({
        title: 'Error',
        description: 'Failed to reset rotation',
        variant: 'destructive',
      });
    }
  };

  const previewNextAgent = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/round-robin/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to preview next agent');
      }

      const data = await response.json();
      toast({
        title: 'Next Agent Preview',
        description: `Next lead will be assigned to: ${data.nextAgent.userName} (${data.nextAgent.reason})`,
      });
    } catch (error) {
      console.error('Error previewing next agent:', error);
      toast({
        title: 'Error',
        description: 'Failed to preview next agent',
        variant: 'destructive',
      });
    }
  };

  const toggleWorkingHours = () => {
    if (config.workingHours) {
      setConfig({ ...config, workingHours: null });
    } else {
      // Set default working hours (Monday-Friday, 9 AM - 5 PM)
      const defaultHours: WorkingHours = {};
      DAYS_OF_WEEK.forEach((day) => {
        defaultHours[day.key] = {
          enabled: !['saturday', 'sunday'].includes(day.key),
          start: '09:00',
          end: '17:00',
        };
      });
      setConfig({ ...config, workingHours: defaultHours });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Round-Robin Lead Assignment</h2>
          <p className="text-muted-foreground mt-1">
            Automatically distribute new leads to your team in a fair, balanced rotation
          </p>
        </div>
        <Badge variant={config.isEnabled ? 'default' : 'secondary'} className="text-sm px-3 py-1">
          {config.isEnabled ? (
            <>
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Active
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4 mr-1" />
              Inactive
            </>
          )}
        </Badge>
      </div>

      {/* Current Status Card */}
      {state?.initialized && config.isEnabled && (
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Current Rotation Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Last Assigned To</p>
                <p className="text-lg font-semibold">{state.lastAssignedUserName}</p>
                <p className="text-xs text-muted-foreground">
                  {state.lastAssignedAt && new Date(state.lastAssignedAt).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Assignments</p>
                <p className="text-lg font-semibold">{state.assignmentCount}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rotation Cycle</p>
                <p className="text-lg font-semibold">#{state.rotationCycle}</p>
              </div>
            </div>
            {state.userPool && state.userPool.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-2">Agent Pool ({state.userPool.length})</p>
                <div className="flex flex-wrap gap-2">
                  {state.userPool.map((user) => (
                    <Badge key={user.id} variant="secondary">
                      {user.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configuration
          </CardTitle>
          <CardDescription>Configure how leads are distributed to your team</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enabled">Enable Round-Robin Assignment</Label>
              <p className="text-sm text-muted-foreground">
                Automatically assign new leads to agents in rotation
              </p>
            </div>
            <Switch
              id="enabled"
              checked={config.isEnabled}
              onCheckedChange={(checked) => setConfig({ ...config, isEnabled: checked })}
            />
          </div>

          <Separator />

          {/* Assignment Scope */}
          <div className="space-y-3">
            <Label>Assignment Scope</Label>
            <Select
              value={config.assignmentScope}
              onValueChange={(value: any) =>
                setConfig({ ...config, assignmentScope: value, teamId: null, departmentId: null })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents (Organization-wide)</SelectItem>
                <SelectItem value="team">Specific Team</SelectItem>
                <SelectItem value="department">Specific Department</SelectItem>
                <SelectItem value="custom">Custom Agent Selection</SelectItem>
              </SelectContent>
            </Select>

            {config.assignmentScope === 'team' && (
              <Select value={config.teamId || ''} onValueChange={(value) => setConfig({ ...config, teamId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {config.assignmentScope === 'department' && (
              <Select
                value={config.departmentId || ''}
                onValueChange={(value) => setConfig({ ...config, departmentId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {config.assignmentScope === 'custom' && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Select agents to include in rotation</p>
                <div className="border rounded-md p-3 space-y-2 max-h-64 overflow-y-auto">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`user-${user.id}`}
                        checked={selectedUsers.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsers([...selectedUsers, user.id]);
                          } else {
                            setSelectedUsers(selectedUsers.filter((id) => id !== user.id));
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <Label htmlFor={`user-${user.id}`} className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <span>{user.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {user.role}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                      </Label>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">{selectedUsers.length} agents selected</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Capacity Limits */}
          <div className="space-y-3">
            <Label>Capacity Limits (Optional)</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="maxPerDay" className="text-sm text-muted-foreground">
                  Max Leads per Agent per Day
                </Label>
                <Input
                  id="maxPerDay"
                  type="number"
                  min="0"
                  placeholder="Unlimited"
                  value={config.maxLeadsPerDay || ''}
                  onChange={(e) =>
                    setConfig({ ...config, maxLeadsPerDay: e.target.value ? parseInt(e.target.value) : null })
                  }
                />
              </div>
              <div>
                <Label htmlFor="maxPerWeek" className="text-sm text-muted-foreground">
                  Max Leads per Agent per Week
                </Label>
                <Input
                  id="maxPerWeek"
                  type="number"
                  min="0"
                  placeholder="Unlimited"
                  value={config.maxLeadsPerWeek || ''}
                  onChange={(e) =>
                    setConfig({ ...config, maxLeadsPerWeek: e.target.value ? parseInt(e.target.value) : null })
                  }
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Working Hours */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label>Working Hours</Label>
                <p className="text-sm text-muted-foreground">Only assign leads during business hours</p>
              </div>
              <Switch checked={!!config.workingHours} onCheckedChange={toggleWorkingHours} />
            </div>

            {config.workingHours && (
              <div className="space-y-3 border rounded-md p-4">
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day.key} className="flex items-center gap-4">
                    <div className="w-24">
                      <Switch
                        checked={config.workingHours![day.key]?.enabled || false}
                        onCheckedChange={(checked) =>
                          setConfig({
                            ...config,
                            workingHours: {
                              ...config.workingHours!,
                              [day.key]: { ...config.workingHours![day.key], enabled: checked },
                            },
                          })
                        }
                      />
                      <Label className="text-sm ml-2">{day.label}</Label>
                    </div>
                    {config.workingHours![day.key]?.enabled && (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          type="time"
                          value={config.workingHours![day.key]?.start || '09:00'}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              workingHours: {
                                ...config.workingHours!,
                                [day.key]: { ...config.workingHours![day.key], start: e.target.value },
                              },
                            })
                          }
                          className="w-32"
                        />
                        <span className="text-muted-foreground">to</span>
                        <Input
                          type="time"
                          value={config.workingHours![day.key]?.end || '17:00'}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              workingHours: {
                                ...config.workingHours!,
                                [day.key]: { ...config.workingHours![day.key], end: e.target.value },
                              },
                            })
                          }
                          className="w-32"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Fallback Options */}
          <div className="space-y-3">
            <Label>Fallback Options</Label>
            <p className="text-sm text-muted-foreground">What happens when no agents are available</p>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="fallbackToCreator"
                  checked={config.fallbackToCreator}
                  onChange={(e) => setConfig({ ...config, fallbackToCreator: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="fallbackToCreator">Assign to lead creator as fallback</Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="skipInactive"
                  checked={config.skipInactiveUsers}
                  onChange={(e) => setConfig({ ...config, skipInactiveUsers: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="skipInactive">Skip inactive users in rotation</Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="skipFull"
                  checked={config.skipFullAgents}
                  onChange={(e) => setConfig({ ...config, skipFullAgents: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="skipFull">Skip agents who reached capacity limit</Label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button onClick={saveConfig} disabled={saving} className="flex-1">
              {saving ? 'Saving...' : 'Save Configuration'}
            </Button>
            <Button variant="outline" onClick={previewNextAgent} disabled={!config.isEnabled}>
              <Eye className="w-4 h-4 mr-2" />
              Preview Next
            </Button>
            <Button variant="outline" onClick={resetRotation} disabled={!config.isEnabled}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset Rotation
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      {statistics && statistics.total > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Assignment Statistics (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Total Assignments: {statistics.total}</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">By Agent:</p>
                <div className="space-y-2">
                  {statistics.byUser.map((userStat) => (
                    <div key={userStat.userId} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <span className="text-sm">{userStat.userName}</span>
                      <Badge variant="secondary">{userStat.count} leads</Badge>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">By Reason:</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(statistics.byReason).map(([reason, count]) => (
                    <Badge key={reason} variant="outline">
                      {reason.replace(/_/g, ' ')}: {count}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
