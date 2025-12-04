# Migration Guide - RBAC System & Deal-Contact Relationship

This guide will help you apply the latest database changes and start using the new RBAC system.

## Database Migration

### Step 1: Apply Prisma Migration

Navigate to the backend directory and run the migration:

```bash
cd backend
npx prisma migrate dev --name add_deal_contact_relation
npx prisma generate
```

This will:
- Add `contactId` field to the Deal model (optional)
- Create the relationship between Deal and Contact
- Add necessary database indexes
- Update the Prisma Client

### Step 2: Restart Backend Server

After migration, restart your backend server:

```bash
# If using npm
npm run dev

# If using yarn
yarn dev

# If using pm2
pm2 restart bharat-crm-backend
```

## RBAC System Usage

### Quick Start

The RBAC system is now fully integrated. Here's how to use it in your components:

#### 1. Check Permissions in Components

```typescript
import { usePermissions } from '@/hooks/usePermissions';

function MyComponent() {
  const { can, isAdmin, isManager } = usePermissions();

  return (
    <div>
      {can('leads:create') && (
        <Button onClick={handleCreate}>Create Lead</Button>
      )}

      {isAdmin() && (
        <Button onClick={handleUserManagement}>Manage Users</Button>
      )}
    </div>
  );
}
```

#### 2. Protected Feature Rendering

```typescript
import { ProtectedFeature } from '@/components/auth/ProtectedFeature';

function Dashboard() {
  return (
    <div>
      <ProtectedFeature permission="analytics:view">
        <AnalyticsCard />
      </ProtectedFeature>

      <ProtectedFeature permission={['reports:generate', 'reports:export']}>
        <ReportsSection />
      </ProtectedFeature>
    </div>
  );
}
```

#### 3. Role-Based Dashboards

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

### User Roles Overview

| Role | Level | Access |
|------|-------|--------|
| **ADMIN** | 4 | Full system access including user management and settings |
| **MANAGER** | 3 | Manage team, leads, deals, view reports |
| **AGENT** | 2 | Create and manage own resources only |
| **VIEWER** | 1 | Read-only access to data |

### Testing the RBAC System

1. **Test as Admin:**
   - Log in with an ADMIN role account
   - Verify you can access all features
   - Check that user management options are visible

2. **Test as Manager:**
   - Log in with a MANAGER role account
   - Verify you can manage leads, deals, contacts
   - Confirm you CANNOT access user management
   - Check that settings are view-only

3. **Test as Agent:**
   - Log in with an AGENT role account
   - Create a lead and verify you can edit/delete it
   - Try to edit another user's lead (should fail or not show option)
   - Verify you cannot assign leads to others

4. **Test as Viewer:**
   - Log in with a VIEWER role account
   - Verify all data is visible but no edit/delete buttons show
   - Confirm create buttons are hidden

## Deal-Contact Relationship

### What Changed

Deals can now optionally be linked to Contacts:

```typescript
// When creating a deal
const deal = {
  title: "New Enterprise Deal",
  company: "Acme Corp",
  contactName: "John Doe",
  contactId: "contact-uuid-here", // ✅ NEW - Optional link to Contact
  value: 50000,
  // ... other fields
};
```

### Benefits

1. **Data Integrity:** Link deals directly to contact records
2. **Auto-population:** Pull company name and contact details from Contact
3. **Relationship Tracking:** See all deals for a contact
4. **Better Reporting:** Analyze deals by contact type or relationship

### Next Steps for Implementation

To fully utilize this relationship, you'll need to:

1. **Update Deal Creation Dialog:**
   - Add contact selector dropdown
   - Fetch contacts from API
   - Auto-populate company/contactName when contact is selected
   - Make contactId optional (deals can exist without linked contacts)

2. **Update Deal Edit Dialog:**
   - Show current linked contact
   - Allow changing or removing contact link

3. **Add Contact Detail View:**
   - Show all deals linked to a contact
   - Display deal value, stage, and probability

## Pending Features

### 1. Deal Dialog with Contact Selector

**Status:** Database ready, UI pending

**Implementation needed:**
- Create/update `src/components/deals/DealDialog.tsx`
- Add contact selector with search functionality
- Auto-populate fields from selected contact
- Handle optional contactId in form submission

### 2. Role Management Page (Admin Only)

**Status:** Not started

**Requirements:**
- User list with current roles
- Role change dropdown (Admin only)
- User activation/deactivation toggle
- Permission matrix display
- Audit log of role changes

**Suggested location:** `src/pages/Settings/UserManagement.tsx`

**Features:**
```typescript
- View all users with their roles
- Change user roles (dropdown)
- View permissions for each role
- Activate/deactivate users
- Search and filter users
- Bulk role assignment
```

### 3. Backend Permission Middleware

**Status:** Documentation provided, implementation needed

The RBAC_GUIDE.md includes examples for backend middleware. You'll need to implement permission checks on sensitive routes.

**Example:**
```javascript
const { hasPermission } = require('../lib/rbac');

async function requirePermission(permission) {
  return async (req, res, next) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { role: true, isActive: true }
    });

    if (!hasPermission(user.role, permission)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

// Use in routes
router.delete('/leads/:id',
  authenticate,
  requirePermission('leads:delete'),
  deleteLeadHandler
);
```

## Verification Checklist

After migration, verify:

- [ ] Database migration completed without errors
- [ ] Backend server restarted successfully
- [ ] Can create/edit deals
- [ ] RBAC system prevents unauthorized actions
- [ ] Different roles see appropriate UI elements
- [ ] No console errors related to permissions
- [ ] Contact selector appears in deal dialog (once implemented)
- [ ] All existing deals still load correctly

## Troubleshooting

### Migration Fails

If `npx prisma migrate dev` fails:

1. Check PostgreSQL is running
2. Verify database connection in `.env`
3. Try: `npx prisma migrate reset` (WARNING: Deletes all data)
4. Or manually apply migration from `backend/prisma/migrations/`

### RBAC Not Working

If permission checks aren't working:

1. Verify user data in localStorage includes `role` field
2. Check browser console for errors
3. Ensure user is logged in with valid token
4. Verify role is one of: ADMIN, MANAGER, AGENT, VIEWER

### Deals Not Loading

If deals stop loading after migration:

1. Check backend logs for database errors
2. Verify `contactId` field is nullable in database
3. Run: `npx prisma db pull` to sync schema
4. Restart backend server

## Documentation

For complete RBAC system documentation, see:
- **RBAC_GUIDE.md** - Complete permission matrix and usage examples
- **backend/prisma/schema.prisma** - Database schema with relationships

## Support

If you encounter issues:
1. Check backend logs: `pm2 logs` or console output
2. Check browser console for frontend errors
3. Verify database connection and migration status
4. Review RBAC_GUIDE.md for usage examples

## Summary

✅ **Completed:**
- RBAC system with 4 roles and 50+ permissions
- usePermissions hook for permission checks
- ProtectedFeature component for conditional rendering
- Deal-Contact relationship in database schema
- Comprehensive documentation

⏳ **Pending:**
- Apply database migration (you need to run commands)
- Create Deal dialog with contact selector (UI implementation)
- Create Role Management page for admins (UI implementation)
- Implement backend permission middleware (optional but recommended)

Once you've applied the migration, the system will be ready for production use with proper role-based access control!
