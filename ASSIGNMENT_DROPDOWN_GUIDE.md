# Assignment Dropdown Implementation Guide

## Overview
This guide explains how to implement the assignment dropdown in your React frontend to allow managers/admins to assign leads, contacts, deals, and tasks to team members.

## Backend API Endpoint

**Endpoint:** `GET /api/users/assignable`

**Description:** Returns list of users that the current user can assign items to (based on their role)

**Response Example:**
```json
[
  {
    "id": "user-uuid-1",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "AGENT"
  },
  {
    "id": "user-uuid-2",
    "name": "Jane Smith",
    "email": "jane@example.com",
    "role": "MANAGER"
  }
]
```

**Access Rules:**
- **ADMIN**: Can assign to any active user
- **MANAGER**: Can assign to users in their department/team
- **AGENT**: Can only assign to themselves (no dropdown needed)
- **VIEWER**: Can only assign to themselves (no dropdown needed)

---

## Frontend Implementation

### 1. Create a Reusable Assignment Dropdown Component

```typescript
// src/components/common/AssignmentDropdown.tsx
import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePermissions } from '@/hooks/usePermissions';

interface AssignableUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AssignmentDropdownProps {
  value?: string;
  onChange: (name: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function AssignmentDropdown({
  value,
  onChange,
  placeholder = "Select assignee",
  disabled = false
}: AssignmentDropdownProps) {
  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin, isManager } = usePermissions();

  useEffect(() => {
    // Only fetch if user is admin or manager
    if (isAdmin || isManager) {
      fetchAssignableUsers();
    } else {
      setLoading(false);
    }
  }, [isAdmin, isManager]);

  const fetchAssignableUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users/assignable', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const users = await response.json();
        setAssignableUsers(users);
      }
    } catch (error) {
      console.error('Failed to fetch assignable users:', error);
    } finally {
      setLoading(false);
    }
  };

  // If agent or viewer, don't show dropdown (auto-assigned to self)
  if (!isAdmin && !isManager) {
    return (
      <div className="text-sm text-muted-foreground">
        Auto-assigned to you
      </div>
    );
  }

  if (loading) {
    return <div className="text-sm">Loading...</div>;
  }

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {assignableUsers.map((user) => (
          <SelectItem key={user.id} value={user.name}>
            {user.name} ({user.role})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

### 2. Use in Lead Form

```typescript
// src/components/leads/LeadForm.tsx
import { AssignmentDropdown } from '@/components/common/AssignmentDropdown';

export function LeadForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    assignedTo: '', // This will be auto-filled for agents
    // ... other fields
  });

  return (
    <form>
      {/* ... other form fields ... */}

      <div>
        <label>Assign To</label>
        <AssignmentDropdown
          value={formData.assignedTo}
          onChange={(name) => setFormData({ ...formData, assignedTo: name })}
          placeholder="Select who to assign this lead to"
        />
      </div>

      {/* ... rest of form ... */}
    </form>
  );
}
```

### 3. Use in Contact Form

```typescript
// src/components/contacts/ContactForm.tsx
import { AssignmentDropdown } from '@/components/common/AssignmentDropdown';

export function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    assignedTo: '',
    // ... other fields
  });

  return (
    <form>
      {/* ... other form fields ... */}

      <div>
        <label>Assign To</label>
        <AssignmentDropdown
          value={formData.assignedTo}
          onChange={(name) => setFormData({ ...formData, assignedTo: name })}
        />
      </div>

      {/* ... rest of form ... */}
    </form>
  );
}
```

### 4. Use in Deal Form

```typescript
// src/components/deals/DealForm.tsx
import { AssignmentDropdown } from '@/components/common/AssignmentDropdown';

export function DealForm() {
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    contactName: '',
    email: '',
    phone: '',
    assignedTo: '',
    // ... other fields
  });

  return (
    <form>
      {/* ... other form fields ... */}

      <div>
        <label>Assign To</label>
        <AssignmentDropdown
          value={formData.assignedTo}
          onChange={(name) => setFormData({ ...formData, assignedTo: name })}
        />
      </div>

      {/* ... rest of form ... */}
    </form>
  );
}
```

### 5. Use in Task Form

```typescript
// src/components/tasks/TaskForm.tsx
import { AssignmentDropdown } from '@/components/common/AssignmentDropdown';

export function TaskForm() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    assignedTo: '',
    // ... other fields
  });

  return (
    <form>
      {/* ... other form fields ... */}

      <div>
        <label>Assign To</label>
        <AssignmentDropdown
          value={formData.assignedTo}
          onChange={(name) => setFormData({ ...formData, assignedTo: name })}
          placeholder="Select who to assign this task to"
        />
      </div>

      {/* ... rest of form ... */}
    </form>
  );
}
```

---

## Key Points

1. **Auto-Assignment**: Backend automatically assigns to creator if `assignedTo` is not provided
2. **Field Names**:
   - All models (Leads, Contacts, Deals, Tasks) use `assignedTo` consistently
3. **Validation**: Backend validates that user has permission to assign to selected person
4. **Display for Agents**: Agents don't need dropdown - items auto-assign to them
5. **Display for Managers**: Show only department/team members
6. **Display for Admins**: Show all active users

---

## Testing

1. **As Admin**: Should see all active users in dropdown
2. **As Manager**: Should see only department/team members
3. **As Agent**: No dropdown shown, auto-assigns to self
4. **Create Lead/Contact/Deal/Task**: Assignment should save correctly
5. **Update Assignment**: Should validate permissions

---

## Error Handling

If assignment is not allowed, backend will return:
```json
{
  "error": "Forbidden",
  "message": "You do not have permission to assign to John Doe"
}
```

Handle this in your form submission:
```typescript
try {
  const response = await fetch('/api/leads', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(formData)
  });

  if (!response.ok) {
    const error = await response.json();
    if (response.status === 403) {
      alert(`Assignment failed: ${error.message}`);
    }
    throw new Error(error.message);
  }

  // Success
} catch (error) {
  console.error('Failed to create lead:', error);
}
```
