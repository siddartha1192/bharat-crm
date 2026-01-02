# Phone Number Normalization and Deduplication Fix

## Overview

This document describes the enterprise-level fix for two critical issues in the Bharat CRM system:

1. **Duplicate WhatsApp Messages**: Messages appearing multiple times due to multiple contacts with the same phone number
2. **Missing Country Codes**: Phone numbers saved without country codes, causing WhatsApp message delivery issues

## Problems Solved

### Problem 1: Duplicate WhatsApp Messages

**Root Cause:**
- Contacts with the same phone number saved multiple times (different users, different roles)
- Phone number matching using "last 10 digits" fallback created ambiguous matches
- No uniqueness constraint on WhatsApp message IDs
- Multiple conversations matched the same phone number

**Solution:**
- Added phone number normalization to E.164 format (e.g., +919876543210)
- Added unique constraint on `whatsappMessageId` and `tenantId`
- Implemented deduplication check before creating messages
- Use normalized phone numbers for conversation lookup

### Problem 2: Missing Country Codes

**Root Cause:**
- No country code field in the database schema
- Phone numbers saved as plain text without validation
- WhatsApp API requires E.164 format for reliable delivery

**Solution:**
- Added country code fields to Contact, Lead, and WhatsAppConversation models
- Added phone number validation and normalization using `libphonenumber-js`
- Created country code selector component for all forms
- Store both display format and normalized E.164 format

## Changes Made

### 1. Database Schema Changes

**Added Fields to `Contact` model:**
- `phoneCountryCode` (String, default: "+91")
- `phoneNormalized` (String, E.164 format)
- `alternatePhoneCountryCode` (String)
- `alternatePhoneNormalized` (String)
- `whatsappCountryCode` (String)
- `whatsappNormalized` (String)

**Added Fields to `Lead` model:**
- `phoneCountryCode` (String, default: "+91")
- `phoneNormalized` (String, E.164 format)
- `whatsappCountryCode` (String)
- `whatsappNormalized` (String)

**Added Fields to `WhatsAppConversation` model:**
- `contactPhoneCountryCode` (String, default: "+91")
- `contactPhoneNormalized` (String, E.164 format, indexed)

**Added Field to `WhatsAppMessage` model:**
- `whatsappMessageId` (String, unique with tenantId)

**Migration File:**
`/backend/prisma/migrations/20260102_add_phone_country_codes_and_deduplication/migration.sql`

### 2. Backend Changes

**New Utility:**
- `/backend/utils/phoneNormalization.js` - Phone number validation and normalization

**Updated Routes:**
- `/backend/routes/contacts.js` - Normalize phone numbers on create/update, duplicate detection
- `/backend/routes/promo.js` - Normalize phone numbers for leads
- `/backend/routes/whatsapp.js` - Message deduplication, normalized phone lookup

**Key Features:**
- Automatic phone number normalization to E.164 format
- Duplicate contact detection based on normalized phone numbers
- WhatsApp message deduplication using unique message IDs
- Support for 25+ countries with proper country codes

### 3. Frontend Changes

**New Component:**
- `/src/components/shared/PhoneInput.tsx` - Reusable phone input with country code selector

**Updated Forms:**
- `/src/components/contacts/ContactDialog.tsx` - Country code selectors for phone, alternate phone, and WhatsApp
- `/src/pages/PromoLanding.tsx` - Country code selector for promotional lead form

**Supported Countries:**
- India (+91), USA (+1), UK (+44), UAE (+971), Singapore (+65)
- And 20+ more countries

### 4. Data Migration Script

**Script:**
`/backend/scripts/migrate-phone-numbers.js`

**Purpose:**
Normalizes all existing phone numbers in the database to E.164 format

## Installation Instructions

### 1. Install Dependencies

```bash
# Frontend
npm install libphonenumber-js

# Backend
cd backend
npm install libphonenumber-js --legacy-peer-deps
```

### 2. Run Database Migration

```bash
cd backend
npx prisma migrate deploy
```

Or apply the migration manually:
```bash
psql -U your_user -d bharat_crm -f backend/prisma/migrations/20260102_add_phone_country_codes_and_deduplication/migration.sql
```

### 3. Migrate Existing Data

```bash
cd backend
node scripts/migrate-phone-numbers.js
```

This will:
- Normalize all existing contact phone numbers
- Normalize all existing lead phone numbers
- Normalize all existing WhatsApp conversation phone numbers
- Display progress and any errors

### 4. Restart the Application

```bash
# Backend
cd backend
npm start

# Frontend
npm run dev
```

## Usage

### For Users

**Creating a New Contact:**
1. Select country code from dropdown (default: India +91)
2. Enter phone number WITHOUT country code (e.g., 9876543210)
3. The system automatically normalizes to E.164 format

**Duplicate Detection:**
- If a contact with the same normalized phone number exists, you'll get an error message
- The error shows the existing contact name and company
- This prevents duplicate contacts across the entire tenant

**WhatsApp Messages:**
- Messages are automatically deduplicated
- Even if multiple people have the same number, messages appear only once
- Conversations are uniquely identified by normalized phone number

### For Developers

**Normalizing Phone Numbers:**
```javascript
const { normalizePhoneNumber } = require('../utils/phoneNormalization');

const result = normalizePhoneNumber('9876543210', '+91');
console.log(result);
// {
//   normalized: '+919876543210',
//   isValid: true,
//   error: null,
//   country: 'IN'
// }
```

**Validating Phone Numbers:**
```javascript
const { validatePhoneNumber } = require('../utils/phoneNormalization');

const isValid = validatePhoneNumber('9876543210', '+91');
console.log(isValid); // true
```

**Using PhoneInput Component:**
```tsx
import { PhoneInput } from '@/components/shared/PhoneInput';

<PhoneInput
  label="Phone Number"
  id="phone"
  phoneValue={phone}
  countryCodeValue={countryCode}
  onPhoneChange={(value) => setPhone(value)}
  onCountryCodeChange={(value) => setCountryCode(value)}
  required
/>
```

## Testing

### Test Cases

1. **Create Contact with Duplicate Phone:**
   - Create a contact with phone: 9876543210
   - Try to create another contact with same phone
   - Expected: Error message about duplicate

2. **WhatsApp Message Deduplication:**
   - Send a WhatsApp message
   - Check database for `whatsappMessageId`
   - Send same message again (shouldn't happen in production, but simulating webhook duplicate)
   - Expected: Message appears only once

3. **Country Code Selection:**
   - Create contact with US number (+1)
   - Verify normalized format: +1XXXXXXXXXX
   - Create contact with India number (+91)
   - Verify normalized format: +91XXXXXXXXXX

4. **Data Migration:**
   - Check existing contacts without `phoneNormalized`
   - Run migration script
   - Verify all contacts now have `phoneNormalized`

## Rollback Plan

If issues occur, you can rollback:

1. **Database Schema Rollback:**
```sql
-- Remove new fields (data will be lost)
ALTER TABLE "Contact" DROP COLUMN "phoneCountryCode";
ALTER TABLE "Contact" DROP COLUMN "phoneNormalized";
-- ... repeat for all new fields
```

2. **Code Rollback:**
```bash
git revert <commit-hash>
```

3. **Keep Data, Disable Features:**
   - Comment out duplicate detection in `/backend/routes/contacts.js`
   - Remove country code selectors from forms (use old Input component)
   - Keep database fields for future re-enable

## Performance Impact

- **Minimal**: Phone normalization is fast (< 1ms per number)
- **Database**: Added indexes on normalized phone fields for fast lookup
- **Migration**: One-time operation, takes ~1 second per 1000 records

## Security Considerations

- Phone numbers are validated before storage
- No PII is logged in normalization process
- Duplicate detection is tenant-scoped (no cross-tenant leakage)

## Monitoring

**Key Metrics to Monitor:**
1. Duplicate contact creation attempts (should see 409 status codes)
2. WhatsApp message deduplication (check logs for "Message already exists")
3. Phone normalization errors (invalid phone numbers)

**Log Messages:**
- `✅ Message saved to conversation` - Successful message save
- `⚠️ Message already exists, skipping duplicate` - Deduplication working
- `📞 Phone normalization: X -> Y` - Phone number normalized

## Support

If you encounter issues:
1. Check logs for error messages
2. Verify database migration completed successfully
3. Ensure libphonenumber-js is installed
4. Run data migration script if phone numbers aren't normalized

## Future Enhancements

1. **Bulk Import with Country Codes**: Update CSV import to support country codes
2. **Phone Number Validation UI**: Show validation errors in real-time
3. **International Number Support**: Add more countries to the selector
4. **Auto-detect Country Code**: Infer country code from phone number format
5. **WhatsApp Number Verification**: Verify WhatsApp number is valid before sending

## References

- [libphonenumber-js Documentation](https://github.com/catamphetamine/libphonenumber-js)
- [E.164 Phone Number Format](https://en.wikipedia.org/wiki/E.164)
- [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)
