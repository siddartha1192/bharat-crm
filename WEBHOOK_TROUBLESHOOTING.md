# WhatsApp Webhook 404 Error - Troubleshooting Guide

## Issue: Getting 404 error when WhatsApp sends webhook to ngrok

This guide will help you fix the webhook 404 error step by step.

---

## Quick Fix (Follow These Steps in Order)

### Step 1: Start Your Backend Server ✅

The most common cause of 404 is that the backend server is not running!

```bash
# Navigate to backend directory
cd backend

# Install dependencies (if not already done)
npm install

# Start the server
npm start
```

**Expected output:**
```
🚀 Server is running on http://localhost:3001
📊 API endpoints available at http://localhost:3001/api
```

**If you see errors:**
- Make sure PostgreSQL is running
- Check if `.env` file exists with correct DATABASE_URL
- Ensure port 3001 is not already in use

---

### Step 2: Test Webhook Locally ✅

Before using ngrok, verify the webhook endpoint works locally:

```bash
# In a NEW terminal (keep backend running)
cd backend
node test-webhook.js
```

**Expected output:**
```
✅ GET webhook verification endpoint is working!
✅ POST webhook message endpoint is working!
✅ All tests passed! Your webhook is ready.
```

**If tests fail:**
- Backend server might not be running
- Check backend logs for errors
- Verify routes are properly loaded

---

### Step 3: Start ngrok ✅

**IMPORTANT:** Keep your backend server running in one terminal, then open a NEW terminal for ngrok.

```bash
# In a NEW terminal window
ngrok http 3001
```

**You should see:**
```
Forwarding    https://abc123.ngrok.io -> http://localhost:3001
```

**Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)

**Common ngrok issues:**
- ❌ ngrok not installed? Download from https://ngrok.com
- ❌ Port 3001 not working? Make sure backend is running on 3001
- ❌ Connection refused? Backend server is not running

---

### Step 4: Test Webhook Through ngrok ✅

Open your browser or use curl to test:

**Test GET (webhook verification):**
```bash
curl "https://YOUR-NGROK-URL.ngrok.io/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=bharat_crm_webhook_token&hub.challenge=test123"
```

**Expected response:** `test123`

**Test POST (message receiver):**
```bash
curl -X POST https://YOUR-NGROK-URL.ngrok.io/api/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{"object":"whatsapp_business_account","entry":[{"changes":[{"field":"messages","value":{"messages":[{"from":"919876543210","type":"text","text":{"body":"Test"}}]}}]}]}'
```

**Expected response:** `EVENT_RECEIVED`

**If you get 404:**
- ✅ Check the URL includes `/api/whatsapp/webhook`
- ✅ Verify backend server is still running
- ✅ Check ngrok is forwarding to port 3001
- ✅ Visit ngrok web interface at http://127.0.0.1:4040 to see requests

---

### Step 5: Configure Webhook in Meta Business Suite ✅

1. **Go to Meta for Developers:** https://developers.facebook.com
2. **Select your app** → WhatsApp → Configuration
3. **Click "Edit" in Webhook section**
4. **Enter these values:**
   - **Callback URL:** `https://YOUR-NGROK-URL.ngrok.io/api/whatsapp/webhook`
     - Example: `https://abc123.ngrok.io/api/whatsapp/webhook`
     - ⚠️ **MUST include `/api/whatsapp/webhook` at the end**
   - **Verify Token:** `bharat_crm_webhook_token`
     - This must match `WHATSAPP_WEBHOOK_VERIFY_TOKEN` in your `.env` file
5. **Click "Verify and Save"**

**If verification fails:**
- Backend server not running
- ngrok not running or expired
- Wrong verify token
- Missing `/api/whatsapp/webhook` in URL
- Using HTTP instead of HTTPS

---

### Step 6: Subscribe to Webhook Fields ✅

After verification succeeds:

1. Click "Manage" in Webhook fields section
2. Subscribe to:
   - ✅ **messages**
   - ✅ **message_status**
3. Click "Done"

---

### Step 7: Test End-to-End ✅

1. **Send a WhatsApp message** to your business number from your personal phone
2. **Check backend logs** - you should see:
   ```
   Received message from +919876543210: Your message here
   ```
3. **Check ngrok web interface** at http://127.0.0.1:4040
   - You should see POST requests from WhatsApp
4. **Open WhatsApp page in CRM**
   - Conversation should appear automatically
   - Message should be visible

---

## Common Issues and Solutions

### Issue: Backend server won't start

**Symptoms:** Error when running `npm start`

**Solutions:**
```bash
# 1. Install dependencies
npm install

# 2. Check if .env file exists
ls -la .env

# 3. Create .env from example if missing
cp .env.example .env

# 4. Edit .env and add database credentials
nano .env

# 5. Ensure PostgreSQL is running
# On Ubuntu/Debian:
sudo systemctl status postgresql

# 6. Test database connection
npx prisma db push
```

---

### Issue: Port 3001 already in use

**Symptoms:** `Error: listen EADDRINUSE: address already in use :::3001`

**Solutions:**
```bash
# Find process using port 3001
lsof -i :3001

# Kill the process (replace PID with actual process ID)
kill -9 PID

# Or use a different port in .env
echo "PORT=3002" >> .env
# Then update ngrok: ngrok http 3002
```

---

### Issue: ngrok shows 404

**Symptoms:** ngrok web interface shows 404 responses

**Solutions:**

1. **Check backend is running:**
   ```bash
   curl http://localhost:3001/api/health
   # Should return: {"status":"ok","message":"Bharat CRM API is running"}
   ```

2. **Verify route exists:**
   ```bash
   curl "http://localhost:3001/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=bharat_crm_webhook_token&hub.challenge=test"
   # Should return: test
   ```

3. **Check ngrok forwarding:**
   - Visit http://127.0.0.1:4040
   - Check "Inspect" tab to see requests and responses
   - Verify requests are reaching your backend

4. **Restart everything:**
   ```bash
   # Stop backend (Ctrl+C)
   # Stop ngrok (Ctrl+C)

   # Start backend first
   cd backend && npm start

   # In new terminal, start ngrok
   ngrok http 3001
   ```

---

### Issue: Webhook verification fails in Meta

**Symptoms:** Meta says "The callback URL or verify token couldn't be validated"

**Solutions:**

1. **Check verify token matches:**
   ```bash
   # In backend/.env file:
   cat .env | grep WHATSAPP_WEBHOOK_VERIFY_TOKEN
   # Should show: WHATSAPP_WEBHOOK_VERIFY_TOKEN=bharat_crm_webhook_token
   ```

2. **Test manually:**
   ```bash
   curl "https://YOUR-NGROK-URL.ngrok.io/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=bharat_crm_webhook_token&hub.challenge=12345"
   # Should return: 12345
   ```

3. **Check URL format:**
   - ✅ Correct: `https://abc123.ngrok.io/api/whatsapp/webhook`
   - ❌ Wrong: `http://abc123.ngrok.io/webhook` (missing https and /api)
   - ❌ Wrong: `https://abc123.ngrok.io/api/whatsapp` (missing /webhook)

4. **Check backend logs:**
   - Look for "Webhook verified successfully" or "Webhook verification failed"

---

### Issue: Messages not appearing in CRM

**Symptoms:** Webhook receives messages but they don't show in CRM

**Solutions:**

1. **Check backend logs for errors**
2. **Verify database connection**
3. **Run Prisma migration:**
   ```bash
   cd backend
   npx prisma migrate dev --name add_whatsapp_conversations
   npx prisma generate
   ```
4. **Restart backend server**
5. **Check frontend is polling:**
   - Open browser console (F12)
   - Look for API calls to `/api/whatsapp/conversations`
6. **Manually refresh conversations list in CRM**

---

### Issue: ngrok URL keeps changing

**Symptoms:** Every time you restart ngrok, URL changes and webhook breaks

**Solutions:**

**Option 1: Use ngrok authtoken (Free account):**
```bash
# Sign up at https://ngrok.com
# Get your authtoken from dashboard
ngrok config add-authtoken YOUR_AUTH_TOKEN

# Your URL will be more stable
ngrok http 3001
```

**Option 2: Use ngrok with custom domain (Paid):**
```bash
ngrok http 3001 --domain=your-custom-domain.ngrok.io
```

**Option 3: Deploy to a VPS/Cloud server (Production):**
- Deploy backend to a server with static IP
- Set up a domain name
- Use nginx as reverse proxy
- Get free SSL with Let's Encrypt

---

## Debugging Checklist

Before asking for help, verify:

- [ ] Backend server is running (check with `curl http://localhost:3001/api/health`)
- [ ] Webhook endpoint works locally (run `node test-webhook.js`)
- [ ] ngrok is running and forwarding to correct port
- [ ] ngrok URL includes `/api/whatsapp/webhook`
- [ ] Verify token matches in `.env` and Meta
- [ ] Database is running and migrations are applied
- [ ] Check backend logs for errors
- [ ] Check ngrok web interface (http://127.0.0.1:4040) for requests

---

## Quick Reference

**Start everything:**
```bash
# Terminal 1: Backend
cd backend
npm start

# Terminal 2: ngrok
ngrok http 3001

# Terminal 3: Test
cd backend
node test-webhook.js
```

**Webhook URL format:**
```
https://YOUR-NGROK-URL.ngrok.io/api/whatsapp/webhook
```

**Verify token:**
```
bharat_crm_webhook_token
```

**Check if backend is running:**
```bash
curl http://localhost:3001/api/health
```

**Check ngrok requests:**
```
http://127.0.0.1:4040
```

---

## Still Having Issues?

1. **Check backend logs** - They will show what's going wrong
2. **Check ngrok web interface** at http://127.0.0.1:4040
3. **Verify all environment variables** in `.env` file
4. **Restart everything** in the correct order (backend → ngrok → configure Meta)
5. **Test each step individually** using the curl commands above

---

## Success Indicators

You'll know everything is working when:

✅ Backend logs show: "Server is running on http://localhost:3001"
✅ Test script shows: "All tests passed! Your webhook is ready"
✅ ngrok shows: "Forwarding https://xxxxx.ngrok.io -> http://localhost:3001"
✅ Meta verification shows: "Webhook verified successfully"
✅ Backend logs show: "Received message from +919876543210: ..."
✅ Messages appear automatically in CRM WhatsApp page

---

**Good luck! 🚀**
