# Role-Based Access Control (RBAC) System

## Overview

This CRM implements a production-ready, scalable Role-Based Access Control (RBAC) system with four user roles and granular permissions.

## User Roles

| Role | Level | Description |
|------|-------|-------------|
| **ADMIN** | 4 | Full system access including user management, settings, and all features |
| **MANAGER** | 3 | Manage team operations, leads, deals, and generate reports |
| **AGENT** | 2 | Create and manage own leads, contacts, deals, and tasks |
| **VIEWER** | 1 | Read-only access to view data and reports |

## Permission Categories

### User Management
- `users:create` - Create new users
- `users:read` - View user list
- `users:update` - Edit user details
- `users:delete` - Delete users
- `users:manage_roles` - Change user roles

### Lead Management
- `leads:create` - Create new leads
- `leads:read` - View leads
- `leads:update` - Edit leads
- `leads:delete` - Delete leads
- `leads:assign` - Assign leads to team members
- `leads:export` - Export lead data

### Contact Management
- `contacts:create` - Create new contacts
- `contacts:read` - View contacts
- `contacts:update` - Edit contacts
- `contacts:delete` - Delete contacts
- `contacts:export` - Export contact data

### Deal Management
- `deals:create` - Create new deals
- `deals:read` - View deals
- `deals:update` - Edit deals
- `deals:delete` - Delete deals
- `deals:assign` - Assign deals to team members

### Task Management
- `tasks:create` - Create tasks
- `tasks:read` - View tasks
- `tasks:update` - Edit tasks
- `tasks:delete` - Delete tasks
- `tasks:assign` - Assign tasks to team members

### Calendar
- `calendar:create` - Create events
- `calendar:read` - View calendar
- `calendar:update` - Edit events
- `calendar:delete` - Delete events

### Invoice Management
- `invoices:create` - Create invoices
- `invoices:read` - View invoices
- `invoices:update` - Edit invoices
- `invoices:delete` - Delete invoices
- `invoices:send` - Send invoices to customers

### WhatsApp
- `whatsapp:read` - View WhatsApp conversations
- `whatsapp:send` - Send WhatsApp messages
- `whatsapp:ai_toggle` - Enable/disable AI for conversations

### AI Assistant
- `ai:use_portal` - Use the Portal AI assistant
- `ai:ingest_documents` - Upload documents to knowledge base

### Analytics & Reports
- `analytics:view` - View analytics dashboard
- `reports:generate` - Generate reports
- `reports:export` - Export reports

### Settings
- `settings:view` - View settings
- `settings:update` - Modify settings
- `integrations:manage` - Manage third-party integrations

## Usage in Code

### 1. Check Permissions in Components

```typescript
import { usePermissions } from '@/hooks/usePermissions';

function LeadsPage() {
  const { can, cannot, isAdmin, isManager } = usePermissions();

  return (
    <div>
      {can('leads:create') && (
        <Button onClick={handleCreate}>Create Lead</Button>
      )}

      {can('leads:export') && (
        <Button onClick={handleExport}>Export</Button>
      )}

      {isAdmin() && (
        <Button onClick={handleBulkDelete}>Bulk Delete</Button>
      )}
    </div>
  );
}
```

### 2. Conditional Rendering with ProtectedFeature

```typescript
import { ProtectedFeature } from '@/components/auth/ProtectedFeature';

function Dashboard() {
  return (
    <div>
      <ProtectedFeature permission="analytics:view">
        <AnalyticsDashboard />
      </ProtectedFeature>

      <ProtectedFeature permission={['reports:generate', 'reports:export']}>
        <ReportsSection />
      </ProtectedFeature>

      <ProtectedFeature
        permission={['users:create', 'users:delete']}
        requireAll
      >
        <UserManagement />
      </ProtectedFeature>
    </div>
  );
}
```

### 3. Role-Based Rendering

```typescript
import { RoleSwitch } from '@/components/auth/ProtectedFeature';

function Dashboard() {
  return (
    <RoleSwitch>
      <RoleSwitch.Admin>
        <AdminDashboard />
      </RoleSwitch.Admin>
      <RoleSwitch.Manager>
        <ManagerDashboard />
      </RoleSwitch.Manager>
      <RoleSwitch.Agent>
        <AgentDashboard />
      </RoleSwitch.Agent>
      <RoleSwitch.Default>
        <ViewerDashboard />
      </RoleSwitch.Default>
    </RoleSwitch>
  );
}
```

### 4. Check Resource Ownership

```typescript
import { usePermissions, useOwnership } from '@/hooks/usePermissions';

function LeadCard({ lead }) {
  const { can } = usePermissions();
  const { owns, canModify } = useOwnership();

  const canEdit = canModify(lead, 'leads:update');
  const canDelete = can('leads:delete') && (isManager() || owns(lead));

  return (
    <Card>
      <h3>{lead.name}</h3>
      {canEdit && <Button onClick={handleEdit}>Edit</Button>}
      {canDelete && <Button onClick={handleDelete}>Delete</Button>}
    </Card>
  );
}
```

## Permission Matrix

| Permission | ADMIN | MANAGER | AGENT | VIEWER |
|------------|-------|---------|-------|--------|
| **Users** |
| Create/Delete Users | ✓ | ✗ | ✗ | ✗ |
| Manage Roles | ✓ | ✗ | ✗ | ✗ |
| View Users | ✓ | ✓ | ✗ | ✗ |
| **Leads** |
| Full CRUD | ✓ | ✓ | Own Only | Read |
| Assign/Export | ✓ | ✓ | ✗ | ✗ |
| **Contacts** |
| Full CRUD | ✓ | ✓ | Own Only | Read |
| Export | ✓ | ✓ | ✗ | ✗ |
| **Deals** |
| Full CRUD | ✓ | ✓ | Own Only | Read |
| Assign | ✓ | ✓ | ✗ | ✗ |
| **Tasks** |
| Full CRUD | ✓ | ✓ | Own Only | Read |
| Assign | ✓ | ✓ | ✗ | ✗ |
| **Calendar** |
| Full CRUD | ✓ | ✓ | ✓ | Read |
| **Invoices** |
| Full CRUD | ✓ | ✓ | Create/Read | Read |
| Send | ✓ | ✓ | ✗ | ✗ |
| **WhatsApp** |
| Full Access | ✓ | ✓ | ✓ | Read |
| AI Toggle | ✓ | ✓ | ✗ | ✗ |
| **AI Assistant** |
| Use Portal AI | ✓ | ✓ | ✓ | ✗ |
| Ingest Docs | ✓ | ✗ | ✗ | ✗ |
| **Analytics** |
| View/Export | ✓ | ✓ | ✗ | ✓ |
| **Settings** |
| View/Update | ✓ | View | ✗ | ✗ |
| Integrations | ✓ | ✗ | ✗ | ✗ |

## Backend Implementation

### Protect Routes with Middleware

```javascript
// Create permission check middleware
const { PrismaClient } = require('@prisma/client');
const { hasPermission } = require('../lib/rbac');
const prisma = new PrismaClient();

async function requirePermission(permission) {
  return async (req, res, next) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { role: true, isActive: true }
      });

      if (!user || !user.isActive) {
        return res.status(403).json({ error: 'User not active' });
      }

      if (!hasPermission(user.role, permission)) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          required: permission
        });
      }

      req.userRole = user.role;
      next();
    } catch (error) {
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
}

// Use in routes
router.delete('/leads/:id',
  authenticate,
  requirePermission('leads:delete'),
  async (req, res) => {
    // Only users with leads:delete permission can access this
  }
);
```

## Database Migration

After updating the schema, run:

```bash
cd backend
npx prisma migrate dev --name add_deal_contact_relation
npx prisma generate
```

## Best Practices

1. **Always check permissions** before rendering UI elements
2. **Use ProtectedFeature** for conditional rendering instead of manual checks
3. **Backend validation** - Always verify permissions on the server side too
4. **Resource ownership** - Agents can only modify their own resources
5. **Graceful degradation** - Show disabled buttons with tooltips instead of hiding them
6. **Audit logging** - Log all permission-based actions for compliance
7. **Regular reviews** - Review and update permissions as business needs evolve

## Future Enhancements

- [ ] Custom role creation
- [ ] Department-based permissions
- [ ] Team-based resource sharing
- [ ] Temporary permission delegation
- [ ] Permission request workflow
- [ ] Audit log dashboard
- [ ] Permission analytics
- [ ] Role templates for quick setup

## Testing Permissions

```typescript
describe('RBAC System', () => {
  it('should allow admin to delete users', () => {
    const role = 'ADMIN';
    expect(hasPermission(role, 'users:delete')).toBe(true);
  });

  it('should not allow agent to delete users', () => {
    const role = 'AGENT';
    expect(hasPermission(role, 'users:delete')).toBe(false);
  });

  it('should allow manager to view but not change settings', () => {
    const role = 'MANAGER';
    expect(hasPermission(role, 'settings:view')).toBe(true);
    expect(hasPermission(role, 'settings:update')).toBe(false);
  });
});
```

## Support

For questions or issues with the RBAC system, please create an issue in the repository.
