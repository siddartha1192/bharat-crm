# How WhatsApp AI Knows What to Create in Database

## 🤔 Your Question

> "How does AI know what schema needs to be updated in the database and what arguments are missing?"

## 📚 Complete Flow Explanation

### Step 1: User Sends WhatsApp Message
```
User: "Create a task for building CRM"
```

### Step 2: WhatsApp AI Analyzes Message

**File:** `backend/services/ai/whatsappAI.service.js`

The AI is given a **system prompt** that teaches it about your CRM features:

```javascript
const SYSTEM_PROMPT = `You are an AI assistant for ${aiConfig.company.name} on WhatsApp.

**FEATURES YOU CAN HELP WITH:**

1. **Appointments/Demos:**
   - User asks to schedule/book appointment
   - Extract: date, time, name, email, phone, company
   - Return action: "create_appointment"

2. **Tasks:**
   - User asks to create task/reminder/todo
   - Extract: title, description, priority (low/medium/high/urgent), dueDate
   - Return action: "create_task"

3. **Leads:**
   - User shows interest in product
   - Extract: name, email, phone, company, source
   - Return action: "create_lead"

**OUTPUT FORMAT (MUST BE VALID JSON):**
{
  "message": "Your friendly response to user",
  "actions": [
    {
      "type": "create_task",
      "data": {
        "title": "Task title",
        "description": "Details",
        "priority": "medium",
        "dueDate": "2025-12-17"
      },
      "confidence": 0.9
    }
  ],
  "metadata": {
    "intent": "task",
    "sentiment": "positive"
  }
}`;
```

**The AI learns from this prompt:**
- ✅ What actions it can perform (create_task, create_appointment, create_lead)
- ✅ What fields to extract from user message
- ✅ What format to return the data in

### Step 3: AI Returns Structured JSON

Based on the user message "Create a task for building CRM", the AI returns:

```json
{
  "message": "Creating your task now! 📋",
  "actions": [{
    "type": "create_task",
    "data": {
      "title": "Create a task for building CRM",
      "description": "",
      "priority": "urgent",
      "dueDate": "2025-12-17"
    },
    "confidence": 1.0
  }],
  "metadata": {
    "intent": "task",
    "sentiment": "positive"
  }
}
```

**What the AI provided:**
- ✅ `title` - Extracted from user message
- ✅ `priority` - Inferred as "urgent"
- ✅ `dueDate` - Calculated from context
- ❌ `assignee` - AI doesn't know about this field! (This is what caused your error)

### Step 4: Action Handler Executes

**File:** `backend/services/ai/actionHandler.service.js`

The action handler receives AI's data and tries to create in database:

```javascript
async createTask(data, context) {
  // Get user info
  const ownerUser = await prisma.user.findFirst({
    where: { email: aiConfig.company.ownerEmail },
  });

  // Create task in database
  const task = await prisma.task.create({
    data: {
      // From AI
      title: data.title,           // ✓ "Create a task for building CRM"
      description: data.description, // ✓ ""
      priority: data.priority,      // ✓ "urgent"
      dueDate: data.dueDate,       // ✓ "2025-12-17"

      // From code (AI doesn't provide these)
      userId: ownerUser.id,        // ✓ Set by action handler
      assignee: ownerUser.name,    // ✓ Set by action handler (FIXED!)
      status: 'todo',              // ✓ Set by action handler
      tags: [],                    // ✓ Set by action handler
    },
  });
}
```

### Step 5: Database Schema Validation

**File:** `backend/prisma/schema.prisma`

```prisma
model Task {
  id          String   @id @default(uuid())
  title       String   // ✓ Required - AI provides
  description String   // ✓ Required - AI provides (can be empty)
  priority    String   // ✓ Required - AI provides
  status      String   // ✓ Required - Code sets to 'todo'
  dueDate     DateTime // ✓ Required - AI provides
  assignee    String   // ✓ Required - Code sets to owner name
  tags        String[] // ✓ Required - Code sets to []
  userId      String   // ✓ Required - Code sets to owner ID
}
```

**Database requires ALL these fields**, so the action handler must provide them.

---

## 🎯 How AI Learns What Fields to Use

### 1. **System Prompt Training**

The AI is "trained" via the system prompt in `whatsappAI.service.js`:

```javascript
**Tasks:**
- Extract: title, description, priority, dueDate
```

This tells the AI: "When creating a task, look for these 4 fields in the user's message"

### 2. **AI Doesn't Know Database Schema**

❌ The AI has **NO DIRECT ACCESS** to your database schema
❌ The AI doesn't know about `assignee`, `userId`, `tags`, `status` fields
✅ The AI only knows what you tell it in the system prompt

### 3. **Action Handler Fills the Gaps**

The action handler (`actionHandler.service.js`) is responsible for:
- ✅ Taking AI's partial data
- ✅ Adding missing required fields (assignee, userId, status, tags)
- ✅ Validating and formatting data
- ✅ Creating record in database

---

## 🔧 Why Your Error Happened

### The Error:
```
Argument `assignee` is missing.
```

### Root Cause:

1. **AI provided:**
   - title ✓
   - priority ✓
   - dueDate ✓

2. **Action handler forgot to add:**
   - assignee ❌ (missing!)

3. **Database required:**
   - ALL fields including `assignee`

4. **Result:** Database rejected the create operation

### The Fix:

```javascript
// BEFORE (Missing assignee)
const task = await prisma.task.create({
  data: {
    title: data.title,
    priority: data.priority,
    dueDate: data.dueDate,
    userId: ownerUser.id,
    // ❌ assignee missing!
  }
});

// AFTER (Fixed)
const task = await prisma.task.create({
  data: {
    title: data.title,
    priority: data.priority,
    dueDate: data.dueDate,
    userId: ownerUser.id,
    assignee: ownerUser.name, // ✓ Added!
    status: 'todo',           // ✓ Added!
    tags: [],                 // ✓ Added!
  }
});
```

---

## 📖 How to Add New AI Capabilities

### Example: Teaching AI to Extract "Due Date"

**Step 1: Update System Prompt**

Edit `backend/services/ai/whatsappAI.service.js`:

```javascript
**Tasks:**
- Extract: title, description, priority, dueDate, assignee (optional)
- If user says "assign to John", set assignee to "John"
- Default priority: medium
```

**Step 2: Update Action Handler**

Edit `backend/services/ai/actionHandler.service.js`:

```javascript
async createTask(data, context) {
  // AI now might provide assignee
  const assigneeName = data.assignee || ownerUser.name;

  const task = await prisma.task.create({
    data: {
      assignee: assigneeName, // Use AI's value or default
    }
  });
}
```

**Step 3: Test**

User: "Create a task for building CRM, assign to John"

AI will now extract:
```json
{
  "title": "Create a task for building CRM",
  "assignee": "John",  // ← New!
  "priority": "medium"
}
```

---

## 🎓 Key Concepts

### 1. **AI is Prompt-Driven**
- AI only knows what you teach it in the system prompt
- To add new fields, update the prompt

### 2. **Action Handler is the Bridge**
- Connects AI output to database schema
- Fills in missing required fields
- Validates and transforms data

### 3. **Database Schema is the Truth**
- Defines what fields are required
- Rejects incomplete data
- Must match Prisma schema exactly

### 4. **Error Messages are Helpful**
```
Argument `assignee` is missing
```
This tells you: "The database needs `assignee` but didn't receive it"

---

## 🔍 Debugging AI Issues

### When AI Creates Wrong Data:

**Check 1: System Prompt**
- Is the field listed in the prompt?
- Are the instructions clear?

**Check 2: AI Response**
- Look at the JSON AI returned
- Did AI extract the right fields?

**Check 3: Action Handler**
- Is the action handler passing all required fields?
- Are field names matching schema exactly?

**Check 4: Database Schema**
- What fields are required?
- Are field types correct (String vs DateTime)?

---

## 📊 Data Flow Diagram

```
┌─────────────────────┐
│  User WhatsApp      │
│  "Create task..."   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  WhatsApp AI        │
│  (whatsappAI.js)    │
│  Prompt: "Extract   │
│  title, priority,   │
│  dueDate"           │
└──────────┬──────────┘
           │
           ▼
     JSON Output
     {
       "type": "create_task",
       "data": {
         "title": "...",
         "priority": "urgent",
         "dueDate": "2025-12-17"
       }
     }
           │
           ▼
┌─────────────────────┐
│  Action Handler     │
│ (actionHandler.js)  │
│  Adds:              │
│  - userId           │
│  - assignee         │
│  - status           │
│  - tags             │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Prisma Database    │
│  Validates schema   │
│  Creates task       │
└─────────────────────┘
```

---

## 💡 Summary

**Q: How does AI know what to update in database?**

**A:** The AI doesn't directly know about the database! Instead:

1. ✅ **System prompt** tells AI what fields to extract from user message
2. ✅ **AI extracts** those specific fields from the conversation
3. ✅ **Action handler** takes AI data + adds missing required fields
4. ✅ **Prisma/Database** validates and saves the complete record

**The AI is like a smart form filler** - it fills in the fields you tell it to look for, and the action handler adds the rest!
