# Subscription System - Complete Guide

## Overview
This document explains how the subscription system works in the CLiM CRM application, including plan definitions, feature access control, and the sidebar filtering mechanism.

---

## 1. Subscription Plans

### Database Schema
**Location:** `backend/prisma/schema.prisma:27-32`

```prisma
enum SubscriptionPlan {
  FREE
  STANDARD
  PROFESSIONAL
  ENTERPRISE
}
```

### Plan Features Matrix

| Plan | Price | AI Features | API Access | Max Users | Description |
|------|-------|-------------|------------|-----------|-------------|
| **FREE** | Free (25 days) | ✅ YES | ❌ NO | 5 | Trial with all features |
| **STANDARD** | ₹999/month | ❌ NO | ❌ NO | 25 | Basic CRM features only |
| **PROFESSIONAL** | ₹1,300/month | ✅ YES | ❌ NO | 100 | Full features including AI |
| **ENTERPRISE** | Custom | ✅ YES | ✅ YES | 500 | All features + API access |

---

## 2. Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Database Layer                                           │
│    Tenant table stores: plan, status, subscriptionEnd       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Backend API                                              │
│    GET /api/auth/me returns user with tenant info           │
│    File: backend/routes/auth.js:220-266                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Frontend AuthContext                                     │
│    Stores user.tenant.plan in React context                 │
│    File: src/contexts/AuthContext.tsx                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. usePlanFeatures Hook                                     │
│    Maps plan → feature flags (hasAIFeatures, etc.)          │
│    File: src/hooks/usePlanFeatures.ts                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. UI Components                                            │
│    - Sidebar: Filters navigation based on hasAIFeatures     │
│    - ProtectedAIRoute: Blocks access to AI pages            │
│    File: src/components/layout/Sidebar.tsx                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Feature Access Control

### Primary Hook: `usePlanFeatures()`
**Location:** `src/hooks/usePlanFeatures.ts`

```typescript
interface PlanFeatures {
  hasAIFeatures: boolean;      // Can access AI Assistant & AI Calls
  hasAPIAccess: boolean;        // Can use REST API
  hasPremiumFeatures: boolean;  // Can use premium features
  maxUsers: number;             // User limit for tenant
  planName: string;             // Display name
  isFreePlan: boolean;          // Plan type flags
  isStandardPlan: boolean;
  isProfessionalPlan: boolean;
  isEnterprisePlan: boolean;
}
```

### Feature Mapping by Plan

```javascript
const features = {
  FREE: {
    hasAIFeatures: true,   // Trial gets all features
    hasAPIAccess: false,
    maxUsers: 5,
  },
  STANDARD: {
    hasAIFeatures: false,  // NO AI features
    hasAPIAccess: false,
    maxUsers: 25,
  },
  PROFESSIONAL: {
    hasAIFeatures: true,   // Has AI features
    hasAPIAccess: false,
    maxUsers: 100,
  },
  ENTERPRISE: {
    hasAIFeatures: true,   // Has AI features
    hasAPIAccess: true,    // Only plan with API access
    maxUsers: 500,
  }
};
```

---

## 4. Sidebar Navigation Filtering

### How It Works
**Location:** `src/components/layout/Sidebar.tsx:54-67`

1. Sidebar component calls `usePlanFeatures()` to get `hasAIFeatures`
2. Filters navigation array to remove items with `requiresAI: true` if user doesn't have AI features
3. Only shows filtered items to user

### AI-Protected Navigation Items

```javascript
const navigation = [
  // ... other items
  { name: 'AI Calls', href: '/calls', icon: Phone,
    badge: 'New', requiresAI: true },
  { name: 'AI Assistant', href: '/ai-assistant', icon: Bot,
    badge: 'New', requiresAI: true },
];
```

### Filtering Logic

```javascript
const { hasAIFeatures, planName } = usePlanFeatures();

const availableNavigation = navigation.filter((item) => {
  if (item.requiresAI && !hasAIFeatures) {
    return false;  // Hide AI items for plans without AI
  }
  return true;
});
```

---

## 5. Route Protection

### ProtectedAIRoute Component
**Location:** `src/components/ProtectedAIRoute.tsx`

Wraps AI feature routes to:
- Check if user has `hasAIFeatures`
- Show upgrade prompt if access denied
- Allow access if user has required features

### Usage in Routes

```javascript
<Route path="/ai-assistant" element={
  <ProtectedAIRoute>
    <AIAssistant />
  </ProtectedAIRoute>
} />
```

---

## 6. Debugging Subscription Issues

### Built-in Debug Logging

Both key files have debug logging:

**usePlanFeatures.ts:**
```javascript
console.log('[usePlanFeatures] User tenant plan:', user?.tenant?.plan);
console.log('[usePlanFeatures] Using plan:', plan);
```

**Sidebar.tsx:**
```javascript
console.log('[Sidebar Debug] Plan:', planName, '| Has AI Features:', hasAIFeatures);
console.log('[Sidebar Debug] Hiding AI item:', item.name);
console.log('[Sidebar Debug] Available navigation items:', availableNavigation.length);
```

### Debug Component
**Location:** `src/components/DebugPlanInfo.tsx`

Shows plan information in bottom-right corner (development mode only).

### Common Issues and Solutions

#### Issue 1: AI items showing for STANDARD users
**Symptoms:** AI Calls and AI Assistant appear in sidebar for STANDARD plan
**Possible Causes:**
1. Tenant plan not set to STANDARD in database
2. Browser cache contains old user data
3. Tenant data not loaded from API

**Solution Steps:**
1. Check browser console for debug logs
2. Verify `[usePlanFeatures] User tenant plan:` shows `STANDARD`
3. Check `[Sidebar Debug] Has AI Features:` shows `false`
4. If plan is not STANDARD, update database
5. If plan is STANDARD but hasAIFeatures is true, check feature mapping

#### Issue 2: User can access AI routes directly
**Symptoms:** Navigating to /ai-assistant works even without AI features
**Cause:** Route not wrapped in ProtectedAIRoute
**Solution:** Wrap route with ProtectedAIRoute component

#### Issue 3: Trial expiration not enforced
**Symptoms:** Free trial continues after 25 days
**Cause:** Backend needs to check subscriptionEnd date
**Solution:** Add middleware to check subscription status

---

## 7. Backend API Endpoints

### Get Current User with Tenant
```
GET /api/auth/me
Authorization: Bearer {token}

Response:
{
  "id": "user-id",
  "email": "user@example.com",
  "name": "User Name",
  "role": "ADMIN",
  "tenantId": "tenant-id",
  "tenant": {
    "id": "tenant-id",
    "name": "Company Name",
    "slug": "company-slug",
    "plan": "STANDARD",
    "status": "ACTIVE",
    "subscriptionStart": "2024-01-01T00:00:00.000Z",
    "subscriptionEnd": "2024-02-01T00:00:00.000Z",
    "settings": {}
  }
}
```

---

## 8. Key Files Reference

| File | Purpose | Key Lines |
|------|---------|-----------|
| `backend/prisma/schema.prisma` | Database schema with plan enum | 27-32 |
| `backend/routes/auth.js` | Auth API including /me endpoint | 220-266 |
| `src/contexts/AuthContext.tsx` | React context for user/tenant data | 14-24 |
| `src/hooks/usePlanFeatures.ts` | Feature mapping by plan | 27-74 |
| `src/components/layout/Sidebar.tsx` | Navigation with filtering | 54-67 |
| `src/components/ProtectedAIRoute.tsx` | Route protection for AI features | All |
| `src/components/DebugPlanInfo.tsx` | Debug panel for plan info | All |

---

## 9. Testing Subscription Logic

### Manual Testing Steps

1. **Test STANDARD Plan:**
   - Update user's tenant to STANDARD in database
   - Clear browser cache and localStorage
   - Login again
   - Verify AI items are hidden in sidebar
   - Try accessing /ai-assistant directly (should show upgrade prompt)

2. **Test PROFESSIONAL Plan:**
   - Update user's tenant to PROFESSIONAL
   - Clear cache and login
   - Verify AI items appear in sidebar
   - Verify can access AI pages

3. **Test FREE Plan:**
   - Create new user (gets FREE trial)
   - Verify all features available
   - Check trial countdown shows in header

### Database Query to Check Plan

```sql
-- Check tenant plan
SELECT id, name, plan, status, subscriptionEnd
FROM "Tenant"
WHERE id = 'your-tenant-id';

-- Update tenant plan
UPDATE "Tenant"
SET plan = 'STANDARD'
WHERE id = 'your-tenant-id';
```

---

## 10. Adding New Plan-Based Features

When adding a new feature that should be restricted by plan:

### Step 1: Update Feature Mapping
Add the feature flag to `usePlanFeatures.ts`:

```javascript
interface PlanFeatures {
  hasAIFeatures: boolean;
  hasNewFeature: boolean;  // Add new flag
  // ...
}
```

### Step 2: Define Availability
Set which plans get the feature:

```javascript
STANDARD: {
  hasAIFeatures: false,
  hasNewFeature: false,  // STANDARD doesn't get it
  // ...
},
PROFESSIONAL: {
  hasAIFeatures: true,
  hasNewFeature: true,   // PROFESSIONAL gets it
  // ...
}
```

### Step 3: Add to Navigation (if applicable)
```javascript
{
  name: 'New Feature',
  href: '/new-feature',
  icon: Icon,
  requiresNewFeature: true  // Custom requirement flag
}
```

### Step 4: Update Sidebar Filter
```javascript
const availableNavigation = navigation.filter((item) => {
  if (item.requiresAI && !hasAIFeatures) return false;
  if (item.requiresNewFeature && !hasNewFeature) return false;
  return true;
});
```

### Step 5: Protect Routes
Create a ProtectedRoute component or use existing ones.

---

## Summary

The subscription system uses a multi-layered approach:
1. **Database** stores the tenant's plan
2. **Backend API** returns plan with user data
3. **Frontend context** manages user/tenant state
4. **usePlanFeatures hook** maps plans to feature flags
5. **UI components** filter navigation and protect routes based on features

**For STANDARD users:**
- ❌ Should NOT see "AI Calls" or "AI Assistant" in sidebar
- ❌ Should NOT access /ai-assistant or /calls routes
- ✅ Should see upgrade prompt if they try to access AI features

**Debug process:**
1. Check browser console for `[usePlanFeatures]` and `[Sidebar Debug]` logs
2. Verify tenant.plan is correctly set in database
3. Clear browser cache if needed
4. Verify API returns correct tenant data
5. Check that hasAIFeatures matches expected value for the plan
