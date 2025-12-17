import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface AssignableUser {
  id: string;
  name: string;
  email: string;
}

interface AssignmentDropdownProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export function AssignmentDropdown({
  value,
  onChange,
  placeholder = 'Select user to assign',
  disabled = false,
}: AssignmentDropdownProps) {
  const [users, setUsers] = useState<AssignableUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAssignableUsers = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get token from localStorage
        const token = localStorage.getItem('token');

        if (!token) {
          throw new Error('No authentication token found');
        }

        const response = await fetch(`${API_BASE_URL}/users/assignable`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch assignable users');
        }

        const data = await response.json();
        setUsers(data);
      } catch (err) {
        console.error('Error fetching assignable users:', err);
        setError(err instanceof Error ? err.message : 'Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    fetchAssignableUsers();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-muted text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading users...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-destructive/10 text-destructive">
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-muted text-muted-foreground">
        <span className="text-sm">No users available for assignment</span>
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {users.map((user) => (
          <SelectItem key={user.id} value={user.name}>
            <div className="flex flex-col">
              <span>{user.name}</span>
              {user.email && (
                <span className="text-xs text-muted-foreground">{user.email}</span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
