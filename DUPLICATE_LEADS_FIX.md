# Duplicate Leads & Missing Deals Fix

## Issues Found and Fixed

### Issue 1: Lead Import Not Creating Linked Deals ❌ → ✅

**Problem:**
When importing leads via CSV (`POST /api/leads/import`), the system was creating both leads and deals, but they were NOT linked together. This meant:
- Leads had `dealId: null`
- Deals existed in isolation without being connected to their leads
- Updates to leads wouldn't sync to deals

**Root Cause:**
In `backend/routes/leads.js` lines 647-684, the import transaction was:
```javascript
// WRONG - Creates unlinked entities
await tx.lead.create({ data: { ...leadData } }); // No dealId
await tx.deal.create({ data: { ...dealData } }); // No lead reference
```

**Fix Applied:**
Changed to match the pattern in POST `/api/leads` (lines 153-186):
```javascript
// CORRECT - Creates linked entities
const deal = await tx.deal.create({ data: { ...dealData } });
await tx.lead.create({
  data: {
    ...leadData,
    dealId: deal.id  // Link to created deal
  }
});
```

**Files Modified:**
- `backend/routes/leads.js` (lines 662-703)

---

### Issue 2: No Deduplication Logic Causing Duplicates ❌ → ✅

**Problem:**
The system had NO checks for duplicate entries based on email. This caused:
- Multiple leads with the same email when importing CSV
- Duplicate leads when forms were submitted multiple times
- Duplicate leads when creating manually via API

**Fix Applied:**

#### A. Manual Lead Creation (`POST /api/leads`)
Added email duplicate check before creating lead:
```javascript
// Check for duplicates
const existingLead = await prisma.lead.findFirst({
  where: { userId, email: leadData.email }
});

if (existingLead) {
  return res.status(400).json({
    error: 'Duplicate lead',
    message: `A lead with email '${leadData.email}' already exists`
  });
}
```

**Files Modified:**
- `backend/routes/leads.js` (lines 152-167)

#### B. CSV Import (`POST /api/leads/import`)
Added duplicate skip logic:
```javascript
// Check for duplicates before importing
if (lead.email) {
  const existingLead = await prisma.lead.findFirst({
    where: { userId, email: lead.email }
  });

  if (existingLead) {
    results.failed++;
    results.errors.push(`Row ${i + 1}: Duplicate email '${lead.email}' - lead already exists`);
    continue; // Skip this row
  }
}
```

**Files Modified:**
- `backend/routes/leads.js` (lines 646-660)

#### C. Form Submissions (`POST /api/forms/public/submit/:slug`)
Added smart duplicate handling:
```javascript
// Check if lead exists
const existingLead = await prisma.lead.findFirst({
  where: { userId: form.userId, email }
});

if (existingLead) {
  // Link submission to existing lead instead of creating duplicate
  await prisma.formSubmission.update({
    where: { id: submission.id },
    data: {
      leadId: existingLead.id,
      status: 'duplicate'
    }
  });
} else {
  // Create new lead + deal
  // ...
}
```

**Files Modified:**
- `backend/routes/forms.js` (lines 333-411)

---

## What Was Fixed

### ✅ Lead Import (`POST /api/leads/import`)
1. Now creates **linked** leads and deals (dealId properly set)
2. Skips duplicate emails during import
3. Reports duplicates in import results
4. Properly maps deal stage from lead status
5. Added priority field mapping from CSV

### ✅ Manual Lead Creation (`POST /api/leads`)
1. Prevents creating duplicate leads with same email
2. Returns clear error message when duplicate detected

### ✅ Form Submissions (`POST /api/forms/public/submit/:slug`)
1. Checks for existing lead before creating new one
2. If duplicate: links submission to existing lead (status: 'duplicate')
3. If new: creates lead + deal and marks submission as 'converted'
4. Prevents duplicate leads from repeated form submissions

---

## Impact

### Before Fix:
- ❌ Imported leads had no associated deals
- ❌ Duplicate leads created on every CSV import
- ❌ Duplicate leads created when forms submitted multiple times
- ❌ Leads and deals not synchronized

### After Fix:
- ✅ All imported leads have linked deals
- ✅ Duplicate emails are detected and skipped
- ✅ Form submissions don't create duplicates
- ✅ Leads and deals are properly synchronized
- ✅ Import results show which rows were duplicates

---

## Deployment

### Pull Latest Code:
```bash
git pull origin claude/inbound-forms-landing-pages-cmfFQ
```

### Restart Backend:
```bash
# Rebuild backend to get updated routes
docker-compose up -d --build backend
```

### Verify Fix:
1. **Test Import:** Upload a CSV with duplicate emails - should skip duplicates
2. **Test Form:** Submit same form twice - should link to existing lead
3. **Check Deals:** All new leads should have associated deals
4. **View Logs:** `docker-compose logs backend | grep "Lead created"`

---

## Testing Checklist

- [ ] Import CSV with new leads - verify deals are created
- [ ] Import CSV with duplicate emails - verify duplicates are skipped
- [ ] Create lead manually via UI - verify duplicate detection works
- [ ] Submit form multiple times - verify no duplicate leads created
- [ ] Check existing leads - verify they're linked to deals (if created after this fix)

---

## Notes

**Existing Duplicates:**
This fix only prevents NEW duplicates. Existing duplicate leads in the database will remain. To clean them up, you'll need to:

1. **Identify Duplicates:**
```sql
SELECT email, COUNT(*)
FROM "Lead"
GROUP BY email
HAVING COUNT(*) > 1;
```

2. **Manually merge or delete** - Contact support if you need help with this

**Future Enhancements:**
- Add duplicate detection based on phone number as well
- Add "merge duplicate leads" feature in UI
- Add batch deduplication tool for existing data
