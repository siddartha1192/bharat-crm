# Tenant-Specific Mail Integration Architecture

## Overview
Transform Bharat CRM from static mail configuration to tenant-specific mail integration with proper Google account isolation.

---

## Current State vs. Target State

### Current State (Problems)
- ❌ Global Gmail credentials in `.env` file
- ❌ OAuth login requests all scopes (profile, email, gmail, calendar)
- ❌ No tenant-level Google Workspace configuration
- ❌ Mixed authentication and service authorization tokens
- ❌ Cannot support multiple tenants with different mail domains

### Target State (Goals)
- ✅ Each tenant configures their own Google Workspace OAuth app
- ✅ Login only requests profile + email (minimal scopes)
- ✅ Separate authorization flows for Gmail and Calendar services
- ✅ User-level service tokens with tenant-level OAuth configuration
- ✅ API settings for tenant admins to manage mail configuration

---

## Architecture Design

### 1. Tenant Settings Schema Enhancement

Add mail configuration to `tenant.settings` JSON field:

```json
{
  "settings": {
    "mail": {
      "provider": "google_workspace",
      "enabled": true,
      "domain": "company.com",
      "oauth": {
        "clientId": "tenant-specific-client-id",
        "clientSecret": "encrypted-client-secret",
        "allowedDomains": ["company.com", "subsidiary.com"]
      },
      "smtp": {
        "fromName": "Company Name",
        "fromEmail": "noreply@company.com",
        "replyTo": "support@company.com"
      },
      "features": {
        "sendEmail": true,
        "readReplies": true,
        "threadTracking": true
      }
    }
  }
}
```

### 2. User Token Separation

**Current (Mixed):**
```
User {
  googleAccessToken    // Used for both auth AND services
  googleRefreshToken   // Shared refresh token
  googleTokenExpiry    // Single expiry
}
```

**Proposed (Separated):**
```
User {
  // Authentication (login) - UNCHANGED
  googleId
  googleEmail
  googleProfilePic

  // Gmail Service Tokens
  gmailAccessToken
  gmailRefreshToken
  gmailTokenExpiry
  gmailConnectedAt
  gmailScopes         // JSON array of granted scopes

  // Calendar Service Tokens
  calendarAccessToken
  calendarRefreshToken
  calendarTokenExpiry
  calendarConnectedAt
  calendarScopes
}
```

### 3. OAuth Flow Separation

#### Flow A: User Login (Minimal Scopes)
```
Purpose: Authenticate user identity
Scopes:
  - https://www.googleapis.com/auth/userinfo.profile
  - https://www.googleapis.com/auth/userinfo.email

Endpoints:
  GET  /api/auth/google/url
  POST /api/auth/google/callback

Token Storage: None (only verify ID token, create session)
```

#### Flow B: Gmail Integration (Service-Specific)
```
Purpose: Send/receive emails on behalf of user
Scopes:
  - https://www.googleapis.com/auth/gmail.send
  - https://www.googleapis.com/auth/gmail.readonly
  - https://www.googleapis.com/auth/gmail.modify (optional)

Endpoints:
  GET  /api/integrations/gmail/auth/url
  POST /api/integrations/gmail/auth/callback
  POST /api/integrations/gmail/disconnect
  GET  /api/integrations/gmail/status

Token Storage: gmailAccessToken, gmailRefreshToken
OAuth Client: Tenant-specific (from tenant.settings.mail.oauth)
```

#### Flow C: Calendar Integration (Already Exists, Enhance)
```
Purpose: Manage calendar events
Scopes:
  - https://www.googleapis.com/auth/calendar
  - https://www.googleapis.com/auth/calendar.events

Endpoints:
  GET  /api/calendar/auth/url
  POST /api/calendar/auth/callback
  POST /api/calendar/auth/disconnect
  GET  /api/calendar/auth/status

Token Storage: calendarAccessToken, calendarRefreshToken
OAuth Client: Tenant-specific (NEW)
```

---

## Database Schema Changes

### Migration: Add Gmail and Calendar Service Tokens

```prisma
model User {
  // ... existing fields ...

  // Gmail Integration
  gmailAccessToken    String?
  gmailRefreshToken   String?
  gmailTokenExpiry    DateTime?
  gmailConnectedAt    DateTime?
  gmailScopes         Json?       // Array of granted scopes

  // Calendar Integration (rename existing)
  calendarAccessToken    String?  // Rename from googleAccessToken
  calendarRefreshToken   String?  // Rename from googleRefreshToken
  calendarTokenExpiry    DateTime?
  calendarConnectedAt    DateTime?
  calendarScopes         Json?

  // Keep these for profile info
  googleId            String? @unique
  googleEmail         String?
  googleProfilePic    String?
}
```

### Migration: Add IntegrationLog Table (Optional, Future)

```prisma
model IntegrationLog {
  id            String   @id @default(uuid())
  tenantId      String
  userId        String
  service       String   // 'gmail', 'calendar', 'whatsapp'
  action        String   // 'connect', 'disconnect', 'refresh_token'
  status        String   // 'success', 'error'
  errorMessage  String?
  metadata      Json?
  createdAt     DateTime @default(now())

  tenant        Tenant   @relation(fields: [tenantId], references: [id])
  user          User     @relation(fields: [userId], references: [id])

  @@index([tenantId, service])
  @@index([userId, service])
}
```

---

## Implementation Steps

### Phase 1: Database & Schema (Foundation)

**Step 1.1: Update Prisma Schema**
- Add `gmailAccessToken`, `gmailRefreshToken`, `gmailTokenExpiry`, `gmailConnectedAt`, `gmailScopes` to User model
- Add `calendarConnectedAt`, `calendarScopes` to User model
- Keep `googleId`, `googleEmail`, `googleProfilePic` for profile data

**Step 1.2: Create Migration**
```bash
npx prisma migrate dev --name add_service_specific_tokens
```

**Step 1.3: Data Migration Script**
- Migrate existing `googleAccessToken` → `calendarAccessToken` (if calendar was connected)
- Clear all tokens to force re-authorization with new scopes

---

### Phase 2: Minimal Login OAuth (Fix Excessive Scopes)

**Step 2.1: Update Auth Service (`services/auth.js`)**

Change `getGoogleAuthUrl()`:
```javascript
// OLD: Requests all scopes
scope: [
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
]

// NEW: Only profile for login
scope: [
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
]
```

Change `googleAuth(code)`:
- Remove token storage (`googleAccessToken`, `googleRefreshToken`)
- Only use ID token verification
- Store only: `googleId`, `googleEmail`, `googleProfilePic`

**Step 2.2: Update Frontend**
- No changes needed (same login flow, less permissions)
- Users will see reduced Google consent screen

---

### Phase 3: Tenant Mail Settings API

**Step 3.1: Create Settings Endpoints**

`PUT /api/settings/mail` - Configure tenant mail settings
```javascript
{
  "provider": "google_workspace",
  "enabled": true,
  "domain": "company.com",
  "oauth": {
    "clientId": "123456.apps.googleusercontent.com",
    "clientSecret": "secret123"
  },
  "smtp": {
    "fromName": "Bharat CRM",
    "fromEmail": "noreply@company.com",
    "replyTo": "support@company.com"
  }
}
```

`GET /api/settings/mail` - Get current mail configuration (sanitized)
```javascript
{
  "provider": "google_workspace",
  "enabled": true,
  "domain": "company.com",
  "oauth": {
    "clientId": "123456.apps.googleusercontent.com",
    "configured": true  // Don't expose secret
  },
  "smtp": { ... }
}
```

**Step 3.2: Validation**
- Require ADMIN role
- Validate OAuth client ID format
- Encrypt client secret before storing
- Validate domain format

---

### Phase 4: Gmail Integration Service

**Step 4.1: Create Gmail Integration Service**

File: `backend/services/gmailIntegration.js`

```javascript
class GmailIntegrationService {
  // Get tenant-specific OAuth client
  getTenantOAuthClient(tenant)

  // Generate authorization URL using tenant OAuth config
  getAuthUrl(tenant, userId, state)

  // Exchange code for tokens (tenant-specific client)
  getTokensFromCode(tenant, code)

  // Save tokens to user record
  saveUserTokens(userId, tokens)

  // Get authenticated Gmail client for user
  getAuthenticatedClient(user, tenant)

  // Refresh expired tokens
  refreshUserTokens(user, tenant)

  // Disconnect Gmail for user
  disconnectGmail(userId)
}
```

**Step 4.2: Create Gmail Integration Routes**

File: `backend/routes/integrations/gmail.js`

```javascript
GET  /api/integrations/gmail/auth/url
  - Check tenant has mail.oauth configured
  - Generate auth URL with tenant OAuth client
  - Include state parameter (userId + CSRF token)

POST /api/integrations/gmail/auth/callback
  - Verify state parameter
  - Exchange code using tenant OAuth client
  - Save tokens to user.gmail* fields
  - Return success

GET  /api/integrations/gmail/status
  - Check if user has gmailAccessToken
  - Return connection status and granted scopes

POST /api/integrations/gmail/disconnect
  - Revoke tokens (optional)
  - Clear user.gmail* fields
  - Return success
```

---

### Phase 5: Update Email Service (Use Tenant Config)

**Step 5.1: Refactor Email Service (`services/email.js`)**

**Current Flow:**
```javascript
getTransporter() {
  // Uses global env GMAIL_USER, GMAIL_REFRESH_TOKEN
}
```

**New Flow:**
```javascript
async getTransporter(user, tenant) {
  // Option 1: User has personal Gmail connected
  if (user.gmailAccessToken) {
    return this.getUserTransporter(user, tenant);
  }

  // Option 2: Fallback to tenant default (if configured)
  if (tenant.settings.mail?.defaultAccount) {
    return this.getTenantTransporter(tenant);
  }

  // Option 3: No mail configured
  throw new Error('No email service configured');
}

async getUserTransporter(user, tenant) {
  // Create OAuth2 client with TENANT credentials
  const oauth2Client = new google.auth.OAuth2(
    tenant.settings.mail.oauth.clientId,
    decrypt(tenant.settings.mail.oauth.clientSecret),
    `${process.env.BACKEND_URL}/api/integrations/gmail/callback`
  );

  // Check if token expired, refresh if needed
  if (user.gmailTokenExpiry < new Date()) {
    await this.refreshUserTokens(user, tenant);
  }

  // Set user credentials
  oauth2Client.setCredentials({
    access_token: user.gmailAccessToken,
    refresh_token: user.gmailRefreshToken,
  });

  // Create Nodemailer transporter
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: user.googleEmail,
      clientId: tenant.settings.mail.oauth.clientId,
      clientSecret: decrypt(tenant.settings.mail.oauth.clientSecret),
      refreshToken: user.gmailRefreshToken,
      accessToken: user.gmailAccessToken,
    }
  });
}
```

**Step 5.2: Update All Email Methods**

Change signatures to accept `user` and `tenant`:
```javascript
// OLD
sendEmail(to, subject, body)

// NEW
sendEmail(user, tenant, to, subject, body)
```

Update internal methods:
- `sendLeadEmail()`
- `sendContactEmail()`
- `sendDealEmail()`
- `sendManualEmail()`

---

### Phase 6: Update Email Routes

**Step 6.1: Pass User & Tenant to Email Service**

File: `backend/routes/emails.js`

```javascript
// Before
router.post('/lead/:leadId', authenticate, tenantContext, async (req, res) => {
  await emailService.sendLeadEmail(leadId, subject, body);
});

// After
router.post('/lead/:leadId', authenticate, tenantContext, async (req, res) => {
  const user = req.user;
  const tenant = req.tenant;
  await emailService.sendLeadEmail(user, tenant, leadId, subject, body);
});
```

**Step 6.2: Add Integration Check Middleware**

```javascript
async function requireGmailIntegration(req, res, next) {
  const user = req.user;
  const tenant = req.tenant;

  // Check user has Gmail connected
  if (!user.gmailAccessToken) {
    return res.status(403).json({
      success: false,
      error: 'Gmail integration required',
      message: 'Please connect your Gmail account to send emails',
      action: 'connect_gmail'
    });
  }

  // Check tenant has mail configured
  if (!tenant.settings?.mail?.oauth?.clientId) {
    return res.status(403).json({
      success: false,
      error: 'Mail not configured',
      message: 'Contact admin to configure mail settings',
      action: 'contact_admin'
    });
  }

  next();
}

// Apply to all email routes
router.post('/send', authenticate, tenantContext, requireGmailIntegration, ...);
```

---

### Phase 7: Calendar Service Enhancement

**Step 7.1: Update Calendar Service (`services/googleCalendar.js`)**

Add tenant-specific OAuth client:
```javascript
// OLD: Uses global GOOGLE_CLIENT_ID
getAuthUrl() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

// NEW: Uses tenant OAuth config
getAuthUrl(tenant, userId) {
  const oauth2Client = new google.auth.OAuth2(
    tenant.settings.mail.oauth.clientId,  // Same as Gmail
    decrypt(tenant.settings.mail.oauth.clientSecret),
    `${process.env.BACKEND_URL}/api/calendar/auth/callback`
  );
}
```

**Step 7.2: Update Token Storage**

Migrate to use new `calendar*` fields instead of `google*` fields.

---

### Phase 8: Security & Encryption

**Step 8.1: Create Encryption Utility**

File: `backend/utils/encryption.js`

```javascript
const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32 bytes
const ALGORITHM = 'aes-256-gcm';

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return JSON.stringify({
    iv: iv.toString('hex'),
    encryptedData: encrypted,
    authTag: authTag.toString('hex')
  });
}

function decrypt(encryptedJson) {
  const { iv, encryptedData, authTag } = JSON.parse(encryptedJson);

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    ENCRYPTION_KEY,
    Buffer.from(iv, 'hex')
  );

  decipher.setAuthTag(Buffer.from(authTag, 'hex'));

  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

module.exports = { encrypt, decrypt };
```

**Step 8.2: Apply Encryption**

Encrypt before saving:
```javascript
tenant.settings.mail.oauth.clientSecret = encrypt(clientSecret);
```

Decrypt before using:
```javascript
const clientSecret = decrypt(tenant.settings.mail.oauth.clientSecret);
```

---

### Phase 9: Frontend Integration (API Only)

**Step 9.1: Settings Page API Endpoints**

Component: Settings > Integrations > Mail

API Calls:
```javascript
// Get current config
GET /api/settings/mail

// Update config
PUT /api/settings/mail
{
  provider: 'google_workspace',
  oauth: { clientId, clientSecret },
  smtp: { fromName, fromEmail, replyTo }
}

// Test connection (optional)
POST /api/settings/mail/test
```

**Step 9.2: User Gmail Connection**

Component: User Settings > Integrations

```javascript
// Get connection status
GET /api/integrations/gmail/status
{
  connected: true,
  email: 'user@company.com',
  scopes: ['gmail.send', 'gmail.readonly'],
  connectedAt: '2025-01-15T10:30:00Z'
}

// Initiate connection
GET /api/integrations/gmail/auth/url
{
  authUrl: 'https://accounts.google.com/o/oauth2/v2/auth?...'
}

// After OAuth callback, frontend redirects back
// Backend handles callback automatically

// Disconnect
POST /api/integrations/gmail/disconnect
```

**Step 9.3: Email Compose - Show Connection Status**

Before sending email:
```javascript
// Check if user has Gmail connected
if (!user.gmailConnected) {
  showAlert('Please connect Gmail to send emails');
  redirectTo('/settings/integrations');
}
```

---

## Security Considerations

1. **Encryption at Rest**
   - Encrypt tenant OAuth client secrets using AES-256-GCM
   - Store encryption key in secure environment variable
   - Never log decrypted secrets

2. **Token Security**
   - Store refresh tokens only (access tokens are temporary)
   - Implement token rotation
   - Clear tokens on user logout/disconnect

3. **OAuth Security**
   - Use state parameter for CSRF protection
   - Validate redirect URIs
   - Implement scope validation

4. **Tenant Isolation**
   - Verify tenant owns OAuth config before using
   - Never leak other tenant's configurations
   - Audit log for configuration changes

5. **Domain Validation**
   - Optionally restrict users to tenant domain (e.g., @company.com)
   - Validate allowed domains in tenant settings

---

## Migration Strategy

### Step 1: Preparation
- Add new database fields
- Deploy encryption utilities
- Create migration scripts

### Step 2: Soft Launch
- Enable for specific tenants (beta flag)
- Provide migration guide for tenant admins
- Monitor error logs

### Step 3: Full Rollout
- Send notification to all tenant admins
- Provide setup wizard in UI
- Deprecate global env variables

### Step 4: Cleanup
- Remove old `googleAccessToken` field
- Remove global GMAIL_USER env variable
- Archive migration scripts

---

## Testing Strategy

### Unit Tests
- Encryption/decryption utilities
- OAuth client creation with tenant config
- Token refresh logic
- Scope validation

### Integration Tests
- Full OAuth flow (mock Google OAuth)
- Email sending with user tokens
- Tenant configuration CRUD
- Token expiry and refresh

### E2E Tests
- Admin configures mail settings
- User connects Gmail account
- Send email successfully
- Disconnect and reconnect flow

---

## Documentation Requirements

### Admin Documentation
- How to create Google Workspace OAuth app
- How to configure tenant mail settings
- Best practices for OAuth client security

### User Documentation
- How to connect personal Gmail
- What permissions are required
- How to disconnect

### Developer Documentation
- Email service API reference
- OAuth flow diagrams
- Troubleshooting guide

---

## Environment Variables

### Required (System-Level)
```bash
# Encryption for secrets
ENCRYPTION_KEY=32-byte-hex-string

# OAuth redirect base URL
BACKEND_URL=https://api.bharatcrm.com

# JWT secret
JWT_SECRET=your-jwt-secret
```

### Deprecated (Remove After Migration)
```bash
# OLD - Global Gmail config (remove)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GMAIL_USER=...
GMAIL_REFRESH_TOKEN=...
GMAIL_REDIRECT_URI=...
```

### New (Tenant-Specific via Settings API)
```
All Google OAuth configs now stored in tenant.settings.mail
```

---

## Success Metrics

1. **Adoption Rate**: % of tenants with mail configured
2. **User Connections**: % of users with Gmail connected per tenant
3. **Email Send Rate**: Emails sent per tenant per day
4. **Error Rate**: Failed emails due to auth issues
5. **Token Refresh Success**: % of successful token refreshes

---

## Rollback Plan

If critical issues arise:

1. **Quick Rollback**
   - Restore global env variables
   - Revert email service to use global config
   - Disable tenant mail settings routes

2. **Data Preservation**
   - Keep new database fields (don't drop)
   - Preserve tenant settings
   - Export configurations for later retry

3. **Communication**
   - Notify tenant admins of rollback
   - Provide timeline for fix and re-launch
   - Offer manual migration assistance

---

## Future Enhancements

1. **Multi-Provider Support**
   - Microsoft 365 / Outlook integration
   - SendGrid / AWS SES for transactional emails
   - Custom SMTP configuration

2. **Advanced Features**
   - Email templates per tenant
   - Scheduled email sending
   - Email tracking and analytics
   - Webhook notifications for email events

3. **Enterprise Features**
   - Service account support (domain-wide delegation)
   - Shared mailbox support
   - Email routing rules
   - Compliance and archiving

---

## File Structure

```
backend/
├── prisma/
│   └── schema.prisma                    # Updated User model
├── services/
│   ├── email.js                         # Refactored to use tenant config
│   ├── gmailIntegration.js              # NEW: Gmail OAuth service
│   ├── googleCalendar.js                # Updated to use tenant config
│   └── auth.js                          # Updated to minimal scopes
├── routes/
│   ├── settings.js                      # Add mail settings endpoints
│   ├── emails.js                        # Updated to require integration
│   └── integrations/
│       └── gmail.js                     # NEW: Gmail integration routes
├── middleware/
│   └── requireGmailIntegration.js       # NEW: Check Gmail connection
├── utils/
│   └── encryption.js                    # NEW: Encrypt/decrypt secrets
└── migrations/
    └── add_service_specific_tokens.sql  # Database migration
```

---

## Conclusion

This architecture provides:
- ✅ Full tenant isolation for mail configuration
- ✅ Minimal OAuth scopes for login (privacy-focused)
- ✅ Service-specific authorization (Gmail, Calendar separate)
- ✅ User-level token storage with tenant-level OAuth config
- ✅ Secure encryption for sensitive credentials
- ✅ API-first design for settings management
- ✅ Backward compatible migration path

The system scales to support multiple tenants with different mail providers while maintaining security and user privacy.
