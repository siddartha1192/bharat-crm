# 🚀 Quick Start - Enterprise AI System

## 5-Minute Setup

### Step 1: Set Up Qdrant Cloud (2 min) ⭐ RECOMMENDED

**IMPORTANT:** For best results, use Qdrant Cloud's **FREE tier** (takes 2 minutes to set up)

📖 **See [QDRANT_CLOUD_SETUP.md](./QDRANT_CLOUD_SETUP.md) for detailed instructions**

Quick steps:
1. Go to https://cloud.qdrant.io/ and sign up
2. Create a free cluster (1GB storage, unlimited requests)
3. Copy your cluster URL and API key

Then update your `.env`:
```env
QDRANT_URL=https://your-cluster.region.cloud.qdrant.io:6333
QDRANT_API_KEY=your_qdrant_api_key
OPENAI_API_KEY=sk-proj-your_openai_key
```

### Step 1b: Alternative - In-Memory Mode (Not Recommended)

⚠️ Only for quick testing - limited functionality

```bash
cd backend

# Add to your .env
cat >> .env << 'EOF'

# ========================================
# ENTERPRISE AI CONFIGURATION
# ========================================

# Vector Database (in-memory mode - NOT RECOMMENDED)
QDRANT_URL=:memory:
VECTOR_COLLECTION_NAME=bharat_crm_knowledge

# AI Models
WHATSAPP_AI_MODEL=gpt-4o-mini
PORTAL_AI_MODEL=gpt-4o
WHATSAPP_AI_TEMPERATURE=0.3
PORTAL_AI_TEMPERATURE=0.7

# Company Info
COMPANY_NAME=Bharat CRM
COMPANY_DESCRIPTION=Complete Business Management Solution for Indian Businesses

# Knowledge Base
KNOWLEDGE_BASE_PATH=./knowledge_base

# Allowed Actions
ALLOWED_WHATSAPP_ACTIONS=create_appointment,create_task,create_lead,get_features
EOF
```

### Step 2: Pull Latest Code (30 sec)

```bash
cd /home/user/bharat-crm
git pull origin claude/crm-core-features-dashboard-01TZ6Y63uw7ZEnmzjvgC14q3
```

### Step 3: Install Dependencies (2 min)

```bash
cd backend
npm install
```

### Step 4: Ingest Documents (1 min)

```bash
# This creates default knowledge base and ingests it
node scripts/ingestDocuments.js
```

You'll see:
```
📚 DOCUMENT INGESTION
✅ Created default product documentation
✅ Created API documentation
📄 Found 2 documents
📤 Ingesting into vector database...
✅ Successfully ingested 45 document chunks
```

### Step 5: Restart Backend (30 sec)

```bash
npm run dev
```

✅ **Done!** Your enterprise AI system is now running.

---

## Test It

### Test 1: Simple Question

Send via WhatsApp:
```
What features does Bharat CRM have?
```

**Expected:**
- AI responds with features from vector database
- Check backend logs for:
  ```
  🤖 Structured AI Response: { message, actions, metadata }
  ```

### Test 2: Book Appointment

```
User: I want to book a demo
AI: Great! What's your name?

User: Test User, test@example.com, tomorrow at 3 PM
AI: Perfect! Confirming your demo...
```

**Check:**
1. Backend logs show:
   ```
   ⚡ Executed 1 action(s)
   ✅ create_appointment: success
   ```

2. Go to CRM Calendar → See green appointment

### Test 3: Create Task

```
User: Remind me to follow up next week
```

**Check:**
- Task created in CRM
- Assigned to you

---

## What Changed

### Before:
```javascript
// Old openai.js
const response = await openai.generateResponse(message);
// Returns string, parse manually
```

### After:
```javascript
// New whatsappAI.service.js
const response = await whatsappAI.processMessage(message);
// Returns JSON: { message, actions, metadata }

// Actions executed automatically
await actionHandler.executeActions(response.actions);
```

---

## Key Files

```
backend/
├── config/
│   └── ai.config.js                 # All AI settings
│
├── services/ai/
│   ├── vectorDB.service.js          # Vector database
│   ├── whatsappAI.service.js        # WhatsApp AI (structured)
│   ├── portalAI.service.js          # Portal AI (enterprise)
│   └── actionHandler.service.js     # Execute actions
│
├── scripts/
│   └── ingestDocuments.js           # Add documents
│
└── knowledge_base/
    ├── product-documentation.md      # Auto-generated
    └── api-documentation.md          # Auto-generated
```

---

## Add Your Own Documents

### 1. Create a document:

```bash
cd backend/knowledge_base

cat > my-feature.md << 'EOF'
# Advanced Lead Scoring

Bharat CRM includes intelligent lead scoring...
EOF
```

### 2. Ingest it:

```bash
cd ..
node scripts/ingestDocuments.js
```

### 3. Ask about it:

```
User: Tell me about lead scoring
AI: [Responds with info from your document]
```

---

## Structured Output Format

Every WhatsApp AI response now follows this structure:

```json
{
  "message": "The text sent to user on WhatsApp",
  "actions": [
    {
      "type": "create_appointment" | "create_task" | "create_lead" | "none",
      "data": {
        // Action-specific data
      },
      "confidence": 0.0-1.0
    }
  ],
  "metadata": {
    "intent": "question" | "appointment" | "task" | "general",
    "sentiment": "positive" | "neutral" | "negative"
  }
}
```

**No more string parsing!** ✨

---

## Configuration

All settings in `backend/.env`:

```env
# Essential
OPENAI_API_KEY=sk-proj-xxxxx        # Your OpenAI key
ENABLE_AI_FEATURE=true              # Enable/disable AI
OWNER_EMAIL=you@email.com           # Your email

# Models (can change)
WHATSAPP_AI_MODEL=gpt-4o-mini       # Fast, cheap
PORTAL_AI_MODEL=gpt-4o              # Powerful

# Temperature (creativity)
WHATSAPP_AI_TEMPERATURE=0.3         # Focused (0.0-1.0)

# Actions (comma-separated)
ALLOWED_WHATSAPP_ACTIONS=create_appointment,create_task,create_lead
```

---

## Monitoring

### Check Logs:

```bash
cd backend
npm run dev

# Watch for:
🤖 Structured AI Response: {...}
⚡ Executed 1 action(s)
✅ create_appointment: success
```

### Check Vector DB:

```bash
node -e "
const vectorDB = require('./services/ai/vectorDB.service');
vectorDB.initialize().then(() => {
  return vectorDB.getStats();
}).then(stats => {
  console.log('Vector DB Stats:', stats);
  process.exit(0);
});
"
```

Output:
```
Vector DB Stats: {
  name: 'bharat_crm_knowledge',
  pointsCount: 45,
  vectorSize: 1536,
  distance: 'Cosine'
}
```

---

## Troubleshooting

### Issue: "Cannot find module 'langchain'"

```bash
cd backend
npm install
```

### Issue: "Vector DB initialization failed"

Check your `.env`:
```bash
grep QDRANT_URL backend/.env
# Should show: QDRANT_URL=:memory:
```

### Issue: "AI returns plain text, not JSON"

Check backend logs - the system auto-wraps plain text in JSON structure.

### Issue: "No documents found"

```bash
cd backend
node scripts/ingestDocuments.js
```

---

## Cost

### Current Setup (per day with 100 WhatsApp messages):

- **WhatsApp AI** (gpt-4o-mini): ~$0.50
- **Embeddings**: ~$0.05
- **Total**: **~$0.55/day** or **~$16/month**

### To reduce costs:

```env
WHATSAPP_AI_MODEL=gpt-3.5-turbo  # 10x cheaper
MAX_CONTEXT_MESSAGES=5           # Less context
```

---

## Next Steps

1. ✅ **Test WhatsApp AI** → Book appointment, create task
2. ✅ **Add your documents** → Knowledge base
3. ⏳ **Portal AI** → Coming soon (internal chat interface)
4. ⏳ **Advanced analytics** → Coming soon

---

## Summary

You now have:

✅ **Structured JSON outputs** - No string parsing
✅ **Vector database** - Semantic search for documents
✅ **Automatic actions** - Appointments, tasks, leads
✅ **Scalable** - Easy to add documents and actions
✅ **Production-ready** - Enterprise architecture

The old `openai.js` is replaced with:
- `whatsappAI.service.js` - Structured WhatsApp AI
- `portalAI.service.js` - Enterprise Portal AI (routes coming soon)
- `vectorDB.service.js` - Vector database
- `actionHandler.service.js` - Execute actions

---

## Help

Read full documentation: `ENTERPRISE_AI_SYSTEM.md`

Questions? Check:
1. Backend logs
2. `.env` configuration
3. Document ingestion output
4. Test with simple queries first

🚀 **You're all set!** Test it by sending a WhatsApp message.
