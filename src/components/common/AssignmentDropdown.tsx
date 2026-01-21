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

// Special value to represent "unassigned" since Radix UI Select doesn't allow empty string
const UNASSIGNED_VALUE = '__unassigned__';

export function AssignmentDropdown({
  value,
  onChange,
  placeholder = 'Select user to assign',
  disabled = false,
}: AssignmentDropdownProps) {
  const [users, setUsers] = useState<AssignableUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Normalize value for Select component (convert empty string to special value)
  const selectValue = value?.trim() || UNASSIGNED_VALUE;

  // Handle value change (convert special value back to empty string)
  const handleValueChange = (newValue: string) => {
    onChange(newValue === UNASSIGNED_VALUE ? '' : newValue);
  };

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
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to fetch assignable users (${response.status})`);
        }

        const data = await response.json();

        // Handle empty array or non-array response
        if (!Array.isArray(data)) {
          console.error('Invalid response from assignable users API:', data);
          setUsers([]);
        } else {
          setUsers(data);
        }
      } catch (err) {
        console.error('Error fetching assignable users:', err);
        // Set a user-friendly error message
        const errorMessage = err instanceof Error ? err.message : 'Failed to load users';
        setError(errorMessage);
        // Set empty users array to allow component to render
        setUsers([]);
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
    // Still render a functional select, but with a warning
    return (
      <Select value={selectValue} onValueChange={handleValueChange} disabled={disabled}>
        <SelectTrigger className="border-destructive/50">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={UNASSIGNED_VALUE}>
            <span className="text-muted-foreground italic">Unassigned</span>
          </SelectItem>
          {value && value.trim() && (
            <SelectItem value={value.trim()}>
              <span>{value.trim()}</span>
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    );
  }

  if (users.length === 0 && !loading && !error) {
    // Allow manual input if no users found
    return (
      <Select value={selectValue} onValueChange={handleValueChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={UNASSIGNED_VALUE}>
            <span className="text-muted-foreground italic">Unassigned</span>
          </SelectItem>
          {value && value.trim() && (
            <SelectItem value={value.trim()}>
              <span>{value.trim()}</span>
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    );
  }

  // Check if current value is valid
  const normalizedValue = value?.trim() || '';
  const isValueValid = normalizedValue && users.some(user => user.name === normalizedValue);

  return (
    <Select
      value={isValueValid ? normalizedValue : UNASSIGNED_VALUE}
      onValueChange={handleValueChange}
      disabled={disabled}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {/* Add "Unassigned" option to clear assignment */}
        <SelectItem value={UNASSIGNED_VALUE}>
          <span className="text-muted-foreground italic">Unassigned</span>
        </SelectItem>

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
