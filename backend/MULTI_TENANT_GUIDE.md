# Multi-Tenant CRM - Implementation Guide

## Overview

This CRM has been upgraded to support multi-tenancy, allowing multiple organizations to use the same application with complete data isolation. Each tenant (organization) has their own isolated data space with no cross-tenant data access possible.

## Architecture

### Tenant Isolation Strategy

We use **Row-Level Multi-Tenancy** with the following characteristics:

- ✅ **Single Database**: All tenants share the same PostgreSQL database
- ✅ **Tenant ID Column**: Every data table includes a `tenantId` column
- ✅ **Automatic Filtering**: Middleware automatically filters all queries by tenant
- ✅ **JWT Context**: Tenant context is embedded in JWT tokens
- ✅ **Complete Isolation**: No queries can access data from other tenants

### Key Components

1. **Tenant Model** (`models/Tenant`)
   - Stores organization information
   - Manages subscription plans and limits
   - Tracks tenant status (ACTIVE, SUSPENDED, TRIAL, CANCELLED)

2. **Tenant Service** (`services/tenant.js`)
   - `createTenant()` - Create new organizations
   - `getTenantById()` - Fetch tenant details
   - `createInvitation()` - Invite users to tenant
   - `getTenantStats()` - Get usage statistics

3. **Tenant Middleware** (`middleware/tenant.js`)
   - `tenantContext` - Extract and validate tenant from JWT
   - `getTenantFilter()` - Helper for tenant-filtered queries
   - `ensureTenantOwnership()` - Verify record ownership

4. **Authentication Updates** (`services/auth.js`)
   - JWT now includes `tenantId` claim
   - Registration requires `tenantId`
   - Login returns tenant context

## Setup & Migration

### 1. Apply Database Migration

```bash
cd backend

# Start PostgreSQL database
docker-compose up -d postgres

# Apply migration
npx prisma migrate deploy

# Or for development
npx prisma migrate dev
```

### 2. Migrate Existing Data

If you have existing users/data, run the migration script:

```bash
node scripts/migrate-to-multi-tenant.js
```

This will:
- Create a default tenant
- Assign all existing users to the default tenant
- Update all existing data with the tenant ID

### 3. Generate Prisma Client

```bash
npx prisma generate
```

## API Usage

### Creating a New Tenant (Organization Signup)

**POST** `/api/tenants`

```json
{
  "name": "Acme Corporation",
  "contactEmail": "admin@acme.com",
  "contactPhone": "+1234567890",
  "plan": "PROFESSIONAL"
}
```

Response:
```json
{
  "tenant": {
    "id": "uuid",
    "name": "Acme Corporation",
    "slug": "acme-corporation-a1b2c3",
    "status": "TRIAL",
    "plan": "PROFESSIONAL",
    "maxUsers": 100
  }
}
```

### User Registration (Tenant-Aware)

**POST** `/api/auth/register`

```json
{
  "email": "user@acme.com",
  "password": "securepassword",
  "name": "John Doe",
  "tenantId": "tenant-uuid-here",
  "role": "AGENT"
}
```

### Inviting Users

**POST** `/api/tenants/current/invitations`
(Requires: Authentication + ADMIN role)

```json
{
  "email": "newuser@acme.com",
  "role": "AGENT"
}
```

Response includes invitation token/URL:
```json
{
  "invitation": {
    "id": "uuid",
    "email": "newuser@acme.com",
    "token": "invitation-token-here",
    "invitationUrl": "http://yourapp.com/invite/invitation-token-here"
  }
}
```

### Accepting Invitation

**POST** `/api/tenants/invitations/:token/accept`

```json
{
  "name": "Jane Doe",
  "password": "securepassword"
}
```

## Updating Existing Routes

All routes that query data must now use tenant filtering. Here's how to update them:

### Before (Single-Tenant):

```javascript
router.get('/', authenticate, async (req, res) => {
  const leads = await prisma.lead.findMany({
    where: { userId: req.user.id }
  });
  res.json({ leads });
});
```

### After (Multi-Tenant):

```javascript
const { tenantContext, getTenantFilter } = require('../middleware/tenant');

router.get('/', authenticate, tenantContext, async (req, res) => {
  const leads = await prisma.lead.findMany({
    where: getTenantFilter(req, { userId: req.user.id })
  });
  res.json({ leads });
});
```

### Creating Records:

```javascript
const { tenantContext, autoInjectTenantId } = require('../middleware/tenant');

router.post('/', authenticate, tenantContext, autoInjectTenantId, async (req, res) => {
  // tenantId is automatically added to req.body
  const lead = await prisma.lead.create({
    data: {
      ...req.body,
      userId: req.user.id
    }
  });
  res.json({ lead });
});
```

## Tenant Management API

### Get Current Tenant

**GET** `/api/tenants/current`
(Requires: Authentication)

### Update Tenant

**PUT** `/api/tenants/current`
(Requires: Authentication + ADMIN role)

```json
{
  "name": "New Organization Name",
  "contactEmail": "newemail@acme.com",
  "settings": {
    "branding": {
      "primaryColor": "#FF5733"
    }
  }
}
```

### Get Tenant Statistics

**GET** `/api/tenants/current/stats`
(Requires: Authentication + ADMIN role)

Response:
```json
{
  "stats": {
    "users": {
      "total": 15,
      "active": 12
    },
    "data": {
      "leads": 1250,
      "contacts": 830,
      "deals": 340
    }
  }
}
```

## Subscription Plans

| Plan | Max Users | Price | Features |
|------|-----------|-------|----------|
| FREE | 5 | $0/mo | Basic CRM features |
| BASIC | 25 | $49/mo | + Email integration |
| PROFESSIONAL | 100 | $199/mo | + AI features, WhatsApp |
| ENTERPRISE | Unlimited | Custom | All features + custom support |

## Security Features

### Data Isolation

1. **JWT-Based Context**: Tenant ID is cryptographically signed in JWT
2. **Middleware Validation**: Every request validates tenant exists and is active
3. **Automatic Filtering**: All database queries auto-filter by tenant
4. **No Cross-Tenant Access**: Impossible to query other tenant's data

### Tenant Status Checks

The `tenantContext` middleware automatically:
- ✅ Validates tenant exists
- ✅ Checks if tenant is suspended/cancelled
- ✅ Verifies subscription hasn't expired
- ✅ Returns appropriate HTTP errors (402, 403, 404)

## Testing Multi-Tenant Isolation

### Test Script

Create `backend/tests/tenant-isolation.test.js`:

```javascript
const request = require('supertest');
const app = require('../server');

describe('Tenant Isolation', () => {
  let tenant1Token, tenant2Token;

  beforeAll(async () => {
    // Create two tenants and get auth tokens
    // ...
  });

  test('User cannot access other tenant data', async () => {
    // Create lead in tenant 1
    const lead1 = await request(app)
      .post('/api/leads')
      .set('Authorization', `Bearer ${tenant1Token}`)
      .send({ name: 'Test Lead', email: 'test@test.com' });

    // Try to access with tenant 2 token
    const response = await request(app)
      .get(`/api/leads/${lead1.body.lead.id}`)
      .set('Authorization', `Bearer ${tenant2Token}`);

    expect(response.status).toBe(404); // Should not find
  });
});
```

### Manual Testing

1. Create two tenants
2. Create users in each tenant
3. Create data (leads, contacts) in each tenant
4. Verify users can only see their tenant's data
5. Verify JWT tokens contain correct tenantId

## Troubleshooting

### Issue: "Tenant ID is required for registration"

**Solution**: Ensure registration includes `tenantId`. Users should either:
- Accept an invitation (which provides tenantId)
- Or first tenant admin creates organization via `/api/tenants`

### Issue: "No tenant context found"

**Solution**: Ensure:
1. User is authenticated
2. JWT includes tenantId claim
3. `tenantContext` middleware is applied to route

### Issue: Migration fails with foreign key errors

**Solution**:
1. Backup your database first
2. Ensure all users have valid data
3. Run migration script again with `FORCE_MIGRATE=true`

## Best Practices

1. **Always use middleware**:
   ```javascript
   router.use(authenticate); // First
   router.use(tenantContext); // Second
   ```

2. **Use helper functions**:
   ```javascript
   const where = getTenantFilter(req, { status: 'active' });
   ```

3. **Never hardcode tenantId**:
   ```javascript
   // ❌ Bad
   where: { tenantId: 'some-id' }

   // ✅ Good
   where: getTenantFilter(req)
   ```

4. **Log tenant context**:
   ```javascript
   console.log(`Action by user ${req.user.id} in tenant ${req.tenant.id}`);
   ```

## Environment Variables

Add to `.env`:

```env
# Tenant Settings
DEFAULT_TENANT_EMAIL=admin@yourcompany.com
FRONTEND_URL=http://localhost:8080

# For migration script
FORCE_MIGRATE=false
```

## Next Steps

1. ✅ Apply database migration
2. ✅ Run data migration script (if needed)
3. ⏳ Update all existing API routes with tenant middleware
4. ⏳ Update frontend to handle tenant context
5. ⏳ Test all functionality with multiple tenants
6. ⏳ Set up tenant billing/subscription management
7. ⏳ Configure tenant-specific email templates

## Support

For issues or questions:
- Check the middleware implementation in `middleware/tenant.js`
- Review the service in `services/tenant.js`
- Check tenant routes in `routes/tenants.js`
- Review migration script in `scripts/migrate-to-multi-tenant.js`
