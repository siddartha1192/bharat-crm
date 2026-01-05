import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useToast } from '@/hooks/use-toast';
import { Plus, Users, Shield, Eye, UserCog, Loader2, Mail, Lock, Check, X } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'AGENT' | 'VIEWER';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'AGENT' as User['role'],
  });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [newRole, setNewRole] = useState<User['role'] | ''>('');
  const [updatingRole, setUpdatingRole] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      toast({
        title: 'User created!',
        description: `${formData.name} has been added. Welcome email sent to ${formData.email}.`,
      });

      // Reset form and close dialog
      setFormData({ name: '', email: '', role: 'AGENT' });
      setAddUserOpen(false);

      // Refresh users list
      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create user',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user status');
      }

      toast({
        title: 'Status updated',
        description: data.message,
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleChangeRole = (user: User) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setShowRoleDialog(true);
  };

  const handleUpdateRole = async () => {
    if (!selectedUser || !newRole) return;

    try {
      setUpdatingRole(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/users/${selectedUser.id}/role`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update role');
      }

      toast({
        title: 'Role Updated',
        description: `${selectedUser.name}'s role has been changed to ${newRole}`,
      });

      await fetchUsers();
      setShowRoleDialog(false);
      setSelectedUser(null);
      setNewRole('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user role',
        variant: 'destructive',
      });
    } finally {
      setUpdatingRole(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const roleConfig: Record<string, { label: string; icon: any; variant: any }> = {
      ADMIN: { label: 'Admin', icon: Shield, variant: 'default' },
      MANAGER: { label: 'Manager', icon: UserCog, variant: 'secondary' },
      AGENT: { label: 'Agent', icon: Users, variant: 'outline' },
      VIEWER: { label: 'Viewer', icon: Eye, variant: 'outline' },
    };

    const config = roleConfig[role] || roleConfig.AGENT;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant as any} className="gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header */}
      <div className="relative">
        <div className="absolute -left-6 top-0 bottom-0 w-1 bg-primary rounded-r" />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">User Management</h1>
            <p className="text-muted-foreground">
              Manage team members, roles, and permissions
            </p>
          </div>
          <Button onClick={() => setAddUserOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="users" className="gap-2">
            <Users className="w-4 h-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="permissions" className="gap-2">
            <Lock className="w-4 h-4" />
            Role Permissions
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Users</p>
              <p className="text-2xl font-bold">{users.length}</p>
            </div>
            <Users className="w-8 h-8 text-primary opacity-50" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Active Users</p>
              <p className="text-2xl font-bold">{users.filter(u => u.isActive).length}</p>
            </div>
            <Users className="w-8 h-8 text-green-500 opacity-50" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Admins</p>
              <p className="text-2xl font-bold">{users.filter(u => u.role === 'ADMIN').length}</p>
            </div>
            <Shield className="w-8 h-8 text-blue-500 opacity-50" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Agents</p>
              <p className="text-2xl font-bold">{users.filter(u => u.role === 'AGENT').length}</p>
            </div>
            <UserCog className="w-8 h-8 text-purple-500 opacity-50" />
          </div>
        </Card>
      </div>

          {/* Users Table */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No users found. Add your first team member!
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>
                        {user.isActive ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleChangeRole(user)}
                          >
                            Change Role
                          </Button>
                          <Button
                            variant={user.isActive ? 'destructive' : 'default'}
                            size="sm"
                            onClick={() => toggleUserStatus(user.id, user.isActive)}
                          >
                            {user.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Role Permissions Tab */}
        <TabsContent value="permissions" className="space-y-6">
          {/* Role Overview Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="p-6 border-2 border-blue-200 bg-blue-50/50">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Admin</h3>
                  <p className="text-xs text-muted-foreground">Level 4</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Full system access including user management, settings, and all features
              </p>
            </Card>

            <Card className="p-6 border-2 border-purple-200 bg-purple-50/50">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-purple-500 rounded-lg">
                  <UserCog className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Manager</h3>
                  <p className="text-xs text-muted-foreground">Level 3</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Manage team operations, leads, deals, and generate reports
              </p>
            </Card>

            <Card className="p-6 border-2 border-green-200 bg-green-50/50">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-500 rounded-lg">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Agent</h3>
                  <p className="text-xs text-muted-foreground">Level 2</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Create and manage own leads, contacts, deals, and tasks
              </p>
            </Card>

            <Card className="p-6 border-2 border-gray-200 bg-gray-50/50">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-gray-500 rounded-lg">
                  <Eye className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Viewer</h3>
                  <p className="text-xs text-muted-foreground">Level 1</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Read-only access to view data and reports
              </p>
            </Card>
          </div>

          {/* Permissions Matrix */}
          <Card>
            <div className="p-6">
              <h3 className="text-xl font-bold mb-2">Permission Matrix</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Comprehensive overview of permissions for each role
              </p>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[250px] font-bold">Permission</TableHead>
                      <TableHead className="text-center font-bold">
                        <div className="flex items-center justify-center gap-2">
                          <Shield className="w-4 h-4 text-blue-500" />
                          Admin
                        </div>
                      </TableHead>
                      <TableHead className="text-center font-bold">
                        <div className="flex items-center justify-center gap-2">
                          <UserCog className="w-4 h-4 text-purple-500" />
                          Manager
                        </div>
                      </TableHead>
                      <TableHead className="text-center font-bold">
                        <div className="flex items-center justify-center gap-2">
                          <Users className="w-4 h-4 text-green-500" />
                          Agent
                        </div>
                      </TableHead>
                      <TableHead className="text-center font-bold">
                        <div className="flex items-center justify-center gap-2">
                          <Eye className="w-4 h-4 text-gray-500" />
                          Viewer
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* User Management */}
                    <TableRow className="bg-blue-50/30">
                      <TableCell colSpan={5} className="font-semibold text-blue-900">
                        👥 User Management
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="pl-8">Create/Delete Users</TableCell>
                      <TableCell className="text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></TableCell>
                      <TableCell className="text-center"><X className="w-5 h-5 text-red-400 mx-auto" /></TableCell>
                      <TableCell className="text-center"><X className="w-5 h-5 text-red-400 mx-auto" /></TableCell>
                      <TableCell className="text-center"><X className="w-5 h-5 text-red-400 mx-auto" /></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="pl-8">Manage Roles</TableCell>
                      <TableCell className="text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></TableCell>
                      <TableCell className="text-center"><X className="w-5 h-5 text-red-400 mx-auto" /></TableCell>
                      <TableCell className="text-center"><X className="w-5 h-5 text-red-400 mx-auto" /></TableCell>
                      <TableCell className="text-center"><X className="w-5 h-5 text-red-400 mx-auto" /></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="pl-8">View Users</TableCell>
                      <TableCell className="text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></TableCell>
                      <TableCell className="text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></TableCell>
                      <TableCell className="text-center"><X className="w-5 h-5 text-red-400 mx-auto" /></TableCell>
                      <TableCell className="text-center"><X className="w-5 h-5 text-red-400 mx-auto" /></TableCell>
                    </TableRow>

                    {/* Leads */}
                    <TableRow className="bg-green-50/30">
                      <TableCell colSpan={5} className="font-semibold text-green-900">
                        🎯 Leads
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="pl-8">Full CRUD</TableCell>
                      <TableCell className="text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></TableCell>
                      <TableCell className="text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></TableCell>
                      <TableCell className="text-center"><Badge variant="outline" className="text-xs">Own Only</Badge></TableCell>
                      <TableCell className="text-center"><Badge variant="outline" className="text-xs">Read Only</Badge></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="pl-8">Assign/Export</TableCell>
                      <TableCell className="text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></TableCell>
                      <TableCell className="text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></TableCell>
                      <TableCell className="text-center"><X className="w-5 h-5 text-red-400 mx-auto" /></TableCell>
                      <TableCell className="text-center"><X className="w-5 h-5 text-red-400 mx-auto" /></TableCell>
                    </TableRow>

                    {/* Contacts */}
                    <TableRow className="bg-purple-50/30">
                      <TableCell colSpan={5} className="font-semibold text-purple-900">
                        📇 Contacts
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="pl-8">Full CRUD</TableCell>
                      <TableCell className="text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></TableCell>
                      <TableCell className="text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></TableCell>
                      <TableCell className="text-center"><Badge variant="outline" className="text-xs">Own Only</Badge></TableCell>
                      <TableCell className="text-center"><Badge variant="outline" className="text-xs">Read Only</Badge></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="pl-8">Export</TableCell>
                      <TableCell className="text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></TableCell>
                      <TableCell className="text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></TableCell>
                      <TableCell className="text-center"><X className="w-5 h-5 text-red-400 mx-auto" /></TableCell>
                      <TableCell className="text-center"><X className="w-5 h-5 text-red-400 mx-auto" /></TableCell>
                    </TableRow>

                    {/* Deals */}
                    <TableRow className="bg-orange-50/30">
                      <TableCell colSpan={5} className="font-semibold text-orange-900">
                        💰 Deals
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="pl-8">Full CRUD</TableCell>
                      <TableCell className="text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></TableCell>
                      <TableCell className="text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></TableCell>
                      <TableCell className="text-center"><Badge variant="outline" className="text-xs">Own Only</Badge></TableCell>
                      <TableCell className="text-center"><Badge variant="outline" className="text-xs">Read Only</Badge></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="pl-8">Assign</TableCell>
                      <TableCell className="text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></TableCell>
                      <TableCell className="text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></TableCell>
                      <TableCell className="text-center"><X className="w-5 h-5 text-red-400 mx-auto" /></TableCell>
                      <TableCell className="text-center"><X className="w-5 h-5 text-red-400 mx-auto" /></TableCell>
                    </TableRow>

                    {/* Tasks */}
                    <TableRow className="bg-pink-50/30">
                      <TableCell colSpan={5} className="font-semibold text-pink-900">
                        ✅ Tasks
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="pl-8">Full CRUD</TableCell>
                      <TableCell className="text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></TableCell>
                      <TableCell className="text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></TableCell>
                      <TableCell className="text-center"><Badge variant="outline" className="text-xs">Own Only</Badge></TableCell>
                      <TableCell className="text-center"><Badge variant="outline" className="text-xs">Read Only</Badge></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="pl-8">Assign</TableCell>
                      <TableCell className="text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></TableCell>
                      <TableCell className="text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></TableCell>
                      <TableCell className="text-center"><X className="w-5 h-5 text-red-400 mx-auto" /></TableCell>
                      <TableCell className="text-center"><X className="w-5 h-5 text-red-400 mx-auto" /></TableCell>
                    </TableRow>

                    {/* WhatsApp */}
                    <TableRow className="bg-teal-50/30">
                      <TableCell colSpan={5} className="font-semibold text-teal-900">
                        💬 WhatsApp
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="pl-8">Full Access</TableCell>
                      <TableCell className="text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></TableCell>
                      <TableCell className="text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></TableCell>
                      <TableCell className="text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></TableCell>
                      <TableCell className="text-center"><Badge variant="outline" className="text-xs">Read Only</Badge></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="pl-8">AI Toggle</TableCell>
                      <TableCell className="text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></TableCell>
                      <TableCell className="text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></TableCell>
                      <TableCell className="text-center"><X className="w-5 h-5 text-red-400 mx-auto" /></TableCell>
                      <TableCell className="text-center"><X className="w-5 h-5 text-red-400 mx-auto" /></TableCell>
                    </TableRow>

                    {/* Analytics */}
                    <TableRow className="bg-indigo-50/30">
                      <TableCell colSpan={5} className="font-semibold text-indigo-900">
                        📊 Analytics & Reports
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="pl-8">View/Export</TableCell>
                      <TableCell className="text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></TableCell>
                      <TableCell className="text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></TableCell>
                      <TableCell className="text-center"><X className="w-5 h-5 text-red-400 mx-auto" /></TableCell>
                      <TableCell className="text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></TableCell>
                    </TableRow>

                    {/* Settings */}
                    <TableRow className="bg-gray-50/30">
                      <TableCell colSpan={5} className="font-semibold text-gray-900">
                        ⚙️ Settings
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="pl-8">View/Update</TableCell>
                      <TableCell className="text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></TableCell>
                      <TableCell className="text-center"><Badge variant="outline" className="text-xs">View Only</Badge></TableCell>
                      <TableCell className="text-center"><X className="w-5 h-5 text-red-400 mx-auto" /></TableCell>
                      <TableCell className="text-center"><X className="w-5 h-5 text-red-400 mx-auto" /></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="pl-8">Integrations</TableCell>
                      <TableCell className="text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></TableCell>
                      <TableCell className="text-center"><X className="w-5 h-5 text-red-400 mx-auto" /></TableCell>
                      <TableCell className="text-center"><X className="w-5 h-5 text-red-400 mx-auto" /></TableCell>
                      <TableCell className="text-center"><X className="w-5 h-5 text-red-400 mx-auto" /></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </Card>

          {/* Legend */}
          <Card className="p-6 bg-muted/30">
            <h4 className="font-semibold mb-3">Legend</h4>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600" />
                <span className="text-sm">Full access granted</span>
              </div>
              <div className="flex items-center gap-2">
                <X className="w-5 h-5 text-red-400" />
                <span className="text-sm">No access</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">Own Only</Badge>
                <span className="text-sm">Can only manage their own records</span>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add User Dialog */}
      <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new team member account. They will receive an email with instructions to set their password.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddUser} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., John Doe"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="e.g., john@company.com"
                required
              />
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Mail className="w-3 h-3" />
                A welcome email will be sent with password setup instructions
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select
                value={formData.role}
                onValueChange={(value: User['role']) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      <div>
                        <div className="font-medium">Admin</div>
                        <div className="text-xs text-muted-foreground">Full system access</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="MANAGER">
                    <div className="flex items-center gap-2">
                      <UserCog className="w-4 h-4" />
                      <div>
                        <div className="font-medium">Manager</div>
                        <div className="text-xs text-muted-foreground">Manage team and view all data</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="AGENT">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <div>
                        <div className="font-medium">Agent</div>
                        <div className="text-xs text-muted-foreground">Manage leads, contacts, deals</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="VIEWER">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      <div>
                        <div className="font-medium">Viewer</div>
                        <div className="text-xs text-muted-foreground">View-only access</div>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddUserOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create User'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Change Role Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Update the role for {selectedUser?.name}. This will change their permissions immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Current Role</label>
              <div>
                <Badge variant="outline">
                  {selectedUser?.role}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newRole">New Role</Label>
              <Select
                value={newRole}
                onValueChange={(value: User['role']) => setNewRole(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      <div>
                        <div className="font-medium">Admin</div>
                        <div className="text-xs text-muted-foreground">Full system access</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="MANAGER">
                    <div className="flex items-center gap-2">
                      <UserCog className="w-4 h-4" />
                      <div>
                        <div className="font-medium">Manager</div>
                        <div className="text-xs text-muted-foreground">Manage team operations</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="AGENT">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <div>
                        <div className="font-medium">Agent</div>
                        <div className="text-xs text-muted-foreground">Manage own resources</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="VIEWER">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      <div>
                        <div className="font-medium">Viewer</div>
                        <div className="text-xs text-muted-foreground">Read-only access</div>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRoleDialog(false)} disabled={updatingRole}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRole} disabled={!newRole || newRole === selectedUser?.role || updatingRole}>
              {updatingRole ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Role'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
