# AI WhatsApp Setup Verification Checklist

## Step 1: Verify OpenAI API Key ⚠️ CRITICAL

Run this command to check your API key:
```bash
cd backend
grep OPENAI_API_KEY .env
```

**Expected output:**
```
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**If you see:**
```
OPENAI_API_KEY=your_openai_api_key_here
```
❌ **This is a PLACEHOLDER - AI will NOT work!**

### How to Fix:
1. Go to https://platform.openai.com/api-keys
2. Sign in/create account
3. Click "Create new secret key"
4. Copy the key (starts with `sk-proj-` or `sk-`)
5. Update backend/.env:
   ```
   OPENAI_API_KEY=sk-proj-your-actual-key-here
   ```
6. **RESTART the backend server** (stop and start again)

---

## Step 2: Restart Backend Server

After updating the .env file, you MUST restart:

```bash
cd backend
# Stop the current server (Ctrl+C if running in terminal)
# Then start it again:
npm start
```

**Why?** Environment variables are loaded only when the server starts.

---

## Step 3: Verify Database Schema

Check if the database has the AI fields:

```bash
cd backend
npx prisma db push
npx prisma generate
```

**Expected output:**
```
The database is already in sync with the Prisma schema.
```

**If you see errors about missing fields:**
```bash
npx prisma migrate dev --name add_whatsapp_ai_fields
npx prisma generate
```

---

## Step 4: Check Backend Logs

When you send a WhatsApp message, you should see these logs:

```
🔍 Checking AI conditions - isEnabled: true, aiEnabled: true, messageType: text
🤖 AI is enabled for conversation xyz, generating response...
🤖 AI Response: Hello! I'm the AI assistant for Bharat CRM...
✅ AI response sent and saved to conversation
```

### If you see:
- `isEnabled: false` → Your API key is invalid or ENABLE_AI_FEATURE=false
- `aiEnabled: false` → Click the AI toggle button in the chat to enable it
- `messageType: image` → AI only responds to text messages
- `❌ Error generating AI response` → Check the error details

---

## Step 5: Test AI Manually

Send a WhatsApp message to your business number:
```
Hi, what is Bharat CRM?
```

**Expected behavior:**
1. Message appears in your CRM chat window
2. Backend logs show AI processing (see Step 4)
3. AI response is sent back via WhatsApp
4. AI response appears in chat window in BLUE color with bot icon

---

## Step 6: Check AI Toggle Button

In the WhatsApp chat interface:
1. Open a conversation
2. Look for the AI button in the top right (next to Send, Refresh, Delete)
3. Button should be **BLUE with "AI On"** if enabled
4. If it's gray/outline with "AI Off", click it to enable

---

## Step 7: Common Issues & Fixes

### Issue: "AI toggle visible but no responses"
**Causes:**
1. ❌ Invalid API key → Update .env and restart server
2. ❌ Backend not restarted after .env change → Restart server
3. ❌ Database missing AI fields → Run migrations (Step 3)
4. ❌ WhatsApp webhook not configured → Check Meta Business Suite

### Issue: "❌ Error: Incorrect API key provided"
**Fix:**
1. Get a valid key from https://platform.openai.com/api-keys
2. Update OPENAI_API_KEY in backend/.env
3. Restart backend server
4. Must start with `sk-proj-` or `sk-`

### Issue: "AI responds but says wrong information"
**Fix:** Edit the PRODUCT_KNOWLEDGE section in `backend/services/openai.js`

### Issue: "AI is too expensive"
**Current setup:** Using `gpt-4o-mini` (cheapest model)
- ~$0.15 per 1 million input tokens
- ~$0.60 per 1 million output tokens
- Average conversation: $0.005 - $0.01

To disable completely: Set `ENABLE_AI_FEATURE=false` in .env

---

## Quick Test Script

Run this to diagnose issues:
```bash
cd backend
node test-ai-setup.js
```

This will check:
- ✅ Environment variables configured
- ✅ AI service enabled
- ✅ Database schema correct
- ✅ OpenAI API working

---

## Need Help?

Check the backend terminal logs when a message arrives. The debug logs will show exactly where it's failing.

Look for these symbols:
- 🔍 = Checking conditions
- 🤖 = AI processing
- ✅ = Success
- ❌ = Error (check the message after this)
