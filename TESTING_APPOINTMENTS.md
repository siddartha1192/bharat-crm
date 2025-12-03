# Testing AI Appointment Booking

## ✅ What Was Fixed

**Previous Problem:**
- AI was calling Google Calendar API directly from openai.js
- This bypassed your existing calendar infrastructure
- Failed when Google credentials weren't properly configured in the AI service

**Solution:**
- Updated AI to use your internal `/api/calendar/events` endpoint
- Now uses the same calendar system as the rest of your CRM
- Automatically syncs with Google Calendar if user has it connected
- Better error handling and logging

---

## 🧪 How to Test Appointment Booking

### Step 1: Make Sure Backend is Running
```bash
cd backend
npm run dev
```

### Step 2: Ensure You Have Google Calendar Connected (Optional but Recommended)

Go to your CRM dashboard → Calendar → Connect Google Calendar

If not connected, appointments will still be created in the CRM database, just not synced to Google.

### Step 3: Test Conversation Flow

Send these messages via WhatsApp to your business number:

**Example 1: Basic Appointment Request**
```
You: Hi, I want to book a demo of Bharat CRM
AI: Great! I'd love to schedule a demo for you. What's your name?
You: Raj Kumar
AI: Nice to meet you, Raj! What's your email address for the calendar invite?
You: raj@example.com
AI: Perfect! Which company are you from?
You: TechCorp Solutions
AI: Great! When would you like to schedule the demo?
You: Tomorrow at 3 PM
AI: Excellent! I'm confirming your demo for [date] at 3 PM...
```

**Example 2: Quick Appointment**
```
You: I need a demo tomorrow at 2 PM. My name is Priya Sharma, email priya@company.com
AI: Perfect! I'm booking your demo for tomorrow at 2 PM...
```

**Example 3: Flexible Dates**
```
You: Can we schedule something next Monday morning?
AI: Sure! What time on Monday works best for you?
You: 10 AM would be great. I'm Amit from StartupXYZ, amit@startupxyz.in
AI: Excellent! Booking your demo for Monday at 10 AM...
```

### Step 4: What to Look For in Backend Logs

When appointment is being created, you should see:

```
🗓️ Appointment data detected, creating calendar event...
📅 Creating appointment via internal calendar API...
Appointment data: {
  "name": "Raj Kumar",
  "email": "raj@example.com",
  "company": "TechCorp",
  "date": "tomorrow",
  "time": "3 PM"
}
📤 Calling internal calendar API with data: { ... }
✅ Calendar event created via internal API: <event-id>
```

### Step 5: Verify in CRM

1. Go to your CRM Calendar view
2. You should see the new appointment:
   - Title: "CRM Demo/Consultation - Raj Kumar"
   - Time: As requested
   - Description: Contains customer details
   - Location: WhatsApp/Online
   - Color: Green (indicates AI-created)

3. If Google Calendar is connected, check there too!

---

## 🔍 Debugging Appointment Issues

### Issue: "Could not determine user ID for calendar event"

**Cause:** The OWNER_EMAIL in .env doesn't match any user in the database

**Fix:**
```bash
# Check your .env
grep OWNER_EMAIL backend/.env

# It should match your login email
# Example: OWNER_EMAIL=siddartha1192@gmail.com
```

### Issue: "Calendar API error: User ID is required"

**Cause:** User ID not being passed correctly

**Check the logs:** Look for the userId being passed to the calendar API

### Issue: Appointment Not Detected

**Symptoms:** AI responds but doesn't create calendar event

**Possible Causes:**
1. Customer didn't provide date AND time (both required)
2. Date/time format not recognized
3. Check logs for "Appointment data detected" message

**Test with explicit format:**
```
I want to book for tomorrow at 3 PM
My name is Test User
Email: test@example.com
```

### Issue: "Failed to create appointment: fetch is not defined"

**Cause:** Using Node.js version < 18

**Fix:** Upgrade to Node.js 18+ or we can add node-fetch package

---

## 📊 Supported Date/Time Formats

The AI understands these formats:

**Dates:**
- "today"
- "tomorrow"
- "next Monday", "next Tuesday", etc.
- "15th January", "Jan 15", "15/01/2024"
- "next week"

**Times:**
- "10 AM", "10AM", "10 am"
- "3 PM", "3PM", "15:00"
- "2:30 PM", "14:30"
- "morning" (defaults to 10 AM)
- "afternoon" (defaults to 2 PM)
- "evening" (defaults to 5 PM)

---

## 🎯 Expected Behavior After Fix

1. ✅ AI detects appointment intent
2. ✅ AI collects customer information
3. ✅ When date+time provided, AI calls internal calendar API
4. ✅ Event created in CRM database
5. ✅ If Google connected, synced to Google Calendar
6. ✅ Customer gets confirmation in WhatsApp
7. ✅ Event appears in CRM calendar view (green color)
8. ✅ You receive email notification (if Google Calendar is connected)

---

## 💡 Pro Tips

1. **Make sure OWNER_EMAIL is correct in .env**
   ```env
   OWNER_EMAIL=your-actual-email@gmail.com
   ```

2. **Connect Google Calendar for best experience:**
   - Calendar invites sent automatically
   - Reminders configured (1 day before + 30 minutes before)
   - Shows up in your Google Calendar

3. **Check the calendar view in CRM:**
   - AI appointments are GREEN
   - Manual appointments are BLUE
   - Shows all details in description

4. **The AI is conversational:**
   - It can handle information in any order
   - It will ask for missing details
   - It confirms before creating the appointment

---

## 📝 What Gets Created

When an appointment is booked via AI:

**In CRM Database (always):**
- Calendar event with all details
- Linked to your user account
- Appears in calendar view

**In Google Calendar (if connected):**
- Calendar event synced
- Email invites sent to customer (if email provided)
- Reminders set:
  - Email: 1 day before
  - Popup: 30 minutes before

**In WhatsApp (always):**
- Confirmation message with date/time
- Customer sees the appointment details

---

Need help? Check the backend logs - they now show detailed information about the appointment creation process!
