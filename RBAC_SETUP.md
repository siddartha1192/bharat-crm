# RBAC System Setup Guide

This guide will help you set up and use the Role-Based Access Control (RBAC) system in Bharat CRM.

## 🎯 Overview

The RBAC system provides 4 user roles with different permission levels:

| Role | Level | Description |
|------|-------|-------------|
| **ADMIN** | 4 | Full system access including user management |
| **MANAGER** | 3 | Team management, can view and manage all resources |
| **AGENT** | 2 | Can create and manage only their own resources |
| **VIEWER** | 1 | Read-only access to data |

## 🚀 Quick Start

### Step 1: Create Your First Admin Account

1. **Sign up in the application** at `/signup` (if you haven't already)
2. **List all users** to find your email:
   ```bash
   node backend/scripts/list-users.js
   ```

3. **Set yourself as ADMIN**:
   ```bash
   node backend/scripts/set-admin.js your-email@example.com
   ```

   You should see:
   ```
   ✅ Success! User has been promoted to ADMIN

   User Details:
   📧 Email: your-email@example.com
   👤 Name: Your Name
   🛡️  Role: ADMIN
   ✓ Status: Active
   ```

4. **Log out and log back in** to refresh your permissions

### Step 2: Access User Management

1. Click on **Settings** in the sidebar (gear icon at bottom)
2. Go to the **User Management** tab
3. You'll see all users with their roles and status

### Step 3: Manage User Roles

As an ADMIN, you can:

- **Change user roles**: Click "Change Role" next to any user
- **Activate/Deactivate users**: Control who can access the system
- **View all users**: See role distribution and user activity

## 📋 Available Scripts

### List All Users
```bash
node backend/scripts/list-users.js
```
Shows all users with their:
- Name and email
- Current role
- Active/Inactive status
- Created date and last login
- Role distribution statistics

### Set User as Admin
```bash
node backend/scripts/set-admin.js <email>
```
Promotes a user to ADMIN role and activates their account.

Example:
```bash
node backend/scripts/set-admin.js admin@company.com
```

## 🔐 Permission System

### ADMIN (Full Access)
✅ Everything below, plus:
- Manage user roles
- Activate/deactivate users
- Delete users
- Manage system settings
- Configure integrations

### MANAGER (Team Management)
✅ Everything below, plus:
- Assign leads, contacts, deals, tasks to anyone
- View all resources (not just own)
- Export data
- Generate and export reports
- Manage WhatsApp AI settings

### AGENT (Own Resources)
✅ Can create and manage own:
- Leads
- Contacts
- Deals
- Tasks
- Calendar events
- Invoices

❌ Cannot:
- View other users' resources
- Assign to others
- Manage team
- Export data

### VIEWER (Read Only)
✅ Can view:
- All data across the system
- Reports and analytics
- Calendar events

❌ Cannot:
- Create, edit, or delete anything
- Export data
- Use WhatsApp AI

## 🎨 Using RBAC in Your Code

### Check Permissions in Components

```typescript
import { usePermissions } from '@/hooks/usePermissions';

function MyComponent() {
  const { can, isAdmin, isManager } = usePermissions();

  return (
    <div>
      {can('leads:create') && (
        <Button onClick={createLead}>Create Lead</Button>
      )}

      {isAdmin() && (
        <Button onClick={manageUsers}>Manage Users</Button>
      )}
    </div>
  );
}
```

### Protect Features with Components

```typescript
import { ProtectedFeature } from '@/components/auth/ProtectedFeature';

function Dashboard() {
  return (
    <div>
      <ProtectedFeature permission="leads:create">
        <CreateLeadButton />
      </ProtectedFeature>

      <ProtectedFeature permission={['reports:generate', 'reports:export']}>
        <ReportsSection />
      </ProtectedFeature>
    </div>
  );
}
```

### Role-Based UI Rendering

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

## 🔧 Backend Implementation

The backend routes in `backend/routes/users.js` handle:

- `GET /api/users` - List all users (MANAGER+)
- `GET /api/users/:id` - Get user details
- `PUT /api/users/:id/role` - Change user role (ADMIN only)
- `PUT /api/users/:id/status` - Activate/deactivate user (ADMIN only)
- `PUT /api/users/:id` - Update user profile
- `DELETE /api/users/:id` - Delete user (ADMIN only)

### Role Hierarchy Middleware

The backend enforces role hierarchy:
```
ADMIN (4) > MANAGER (3) > AGENT (2) > VIEWER (1)
```

Higher roles automatically have all permissions of lower roles.

## 🧪 Testing the System

### Test as Different Roles

1. **Create test users** with different emails
2. **Set their roles** using the User Management page or CLI
3. **Log in as each user** to test permissions
4. **Verify UI elements** show/hide based on role

### What to Test

- [ ] ADMIN can access User Management
- [ ] MANAGER cannot see User Management
- [ ] AGENT can only edit own leads
- [ ] VIEWER cannot create anything
- [ ] Role changes take effect immediately (after logout/login)
- [ ] Deactivated users cannot log in

## 🚨 Important Security Notes

### For Admins

1. **Cannot change own role** - Prevents accidentally demoting yourself
2. **Cannot deactivate own account** - Prevents locking yourself out
3. **Cannot delete own account** - Safety measure

### Role Changes

- Role changes are **immediate** in the database
- User must **log out and log back in** to refresh their token with new permissions
- Consider implementing token refresh in the future for instant permission updates

### First Admin Setup

- **Important**: Set up your first admin **immediately after deployment**
- All new signups default to **VIEWER** role (safest default)
- Only ADMINs can promote other users

## 🔄 Common Workflows

### Onboarding New Users

1. User signs up at `/signup` (becomes VIEWER by default)
2. Admin goes to Settings → User Management
3. Admin changes user role based on their position
4. User logs out and back in to get new permissions

### Promoting Users

1. Agent performs well → Promote to MANAGER
2. Manager becomes team lead → Promote to ADMIN
3. Use User Management page or CLI script

### Offboarding Users

1. Go to Settings → User Management
2. Click "Deactivate" next to user
3. User cannot log in anymore
4. All their data remains in the system
5. Can be reactivated later if needed

## 📊 Monitoring Users

Use the User Management page to:

- See when users last logged in
- Track role distribution across team
- Identify inactive accounts
- Monitor account creation dates

## 🆘 Troubleshooting

### "I can't see User Management tab"
- You need ADMIN or MANAGER role
- Log out and log back in after role change
- Check your role with: `node backend/scripts/list-users.js`

### "Permission Denied" errors
- Your role doesn't have required permission
- Contact your admin to adjust your role
- Check RBAC_GUIDE.md for permission matrix

### "Cannot change my own role"
- This is a security feature
- Ask another admin to change your role
- Or use CLI script with another admin account

### Script Errors
```bash
# Make sure you're in the project root
cd /path/to/bharat-crm

# Ensure Prisma is set up
cd backend
npx prisma generate

# Then run scripts
node backend/scripts/list-users.js
```

## 📚 Additional Resources

- **RBAC_GUIDE.md** - Complete permission matrix
- **MIGRATION.md** - Database migration guide
- **backend/routes/users.js** - User management API
- **src/lib/rbac.ts** - Permission definitions

## 🎉 Next Steps

1. ✅ Set up your first admin account
2. ✅ Access User Management page
3. ✅ Create team members with appropriate roles
4. ✅ Test permissions for each role
5. 📖 Read RBAC_GUIDE.md for detailed permission matrix
6. 🔧 Customize permissions based on your needs

## 💡 Pro Tips

- Start with lower roles (AGENT) and promote as needed
- Use VIEWER role for stakeholders who need visibility only
- MANAGER role is perfect for team leads
- Keep at least 2 ADMIN accounts for redundancy
- Regularly review user access and deactivate unused accounts

---

Need help? Check the documentation or create an issue on GitHub.
