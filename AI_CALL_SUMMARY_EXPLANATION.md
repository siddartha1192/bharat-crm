# AI Call Summary System - Complete Explanation

## Overview

The AI Call Summary feature uses OpenAI GPT to generate concise summaries of call transcripts, highlighting key points, customer concerns, next steps, and sentiment.

## How It Works (Backend Flow)

### 1. **API Endpoint**
Location: `/home/user/bharat-crm/backend/routes/calls.js` (lines 252-280)

```javascript
POST /api/calls/logs/:id/generate-summary
```

**What it does:**
1. Verifies the call log exists and user has access (tenant check)
2. Calls `callService.generateCallSummary(id)`
3. Returns the generated summary

### 2. **Call Service**
Location: `/home/user/bharat-crm/backend/services/callService.js` (lines 290-353)

**Process:**
1. Fetches the call log with transcript
2. Gets tenant's OpenAI API key from `callSettings`
3. Sends the transcript to OpenAI API
4. Saves the summary to the database
5. Returns the updated call log

**Current Code:**
```javascript
async generateCallSummary(callLogId) {
  // 1. Get call log with transcript
  const callLog = await prisma.callLog.findUnique({
    where: { id: callLogId },
    include: { lead: true, contact: true }
  });

  if (!callLog || !callLog.transcript) {
    throw new Error('CallLog or transcript not found');
  }

  // 2. Get tenant's OpenAI settings
  const settings = await prisma.callSettings.findUnique({
    where: { tenantId: callLog.tenantId }
  });

  if (!settings || !settings.openaiApiKey) {
    throw new Error('OpenAI not configured');
  }

  // 3. Call OpenAI API
  const OpenAI = require('openai');
  const openai = new OpenAI({ apiKey: settings.openaiApiKey });

  const completion = await openai.chat.completions.create({
    model: settings.openaiModel || 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a helpful assistant that summarizes sales call transcripts. Provide a concise summary highlighting key points, customer concerns, next steps, and overall sentiment.'
      },
      {
        role: 'user',
        content: `Summarize this call transcript:\n\n${callLog.transcript}`
      }
    ],
    temperature: 0.5,
    max_tokens: 300
  });

  const summary = completion.choices[0].message.content;

  // 4. Save to database
  const updatedCallLog = await prisma.callLog.update({
    where: { id: callLogId },
    data: {
      summary,
      aiTokensUsed: completion.usage.total_tokens,
      aiCost: this.calculateOpenAICost(completion.usage, settings.openaiModel)
    }
  });

  return updatedCallLog;
}
```

## System Prompt and User Prompt

### **System Prompt** (Role: system)
```
You are a helpful assistant that summarizes sales call transcripts.
Provide a concise summary highlighting key points, customer concerns,
next steps, and overall sentiment.
```

**Purpose:** Defines the AI's role and output format

**Key Elements:**
- Role: Helpful assistant
- Task: Summarize sales call transcripts
- Focus areas:
  - Key points
  - Customer concerns
  - Next steps
  - Overall sentiment

### **User Prompt** (Role: user)
```
Summarize this call transcript:

[TRANSCRIPT TEXT HERE]
```

**Purpose:** Provides the actual transcript to summarize

### **Configuration:**
- **Model:** `gpt-4o-mini` (default) or configured in settings
- **Temperature:** `0.5` (balanced between creativity and consistency)
- **Max Tokens:** `300` (controls summary length ~225 words)

## Frontend Flow

### 1. **Button Click**
Location: `/home/user/bharat-crm/src/pages/calls/CallLogs.tsx` (line 362)

```tsx
<Button
  onClick={() => generateSummary.mutate(selectedCall.id)}
  disabled={generateSummary.isPending}
>
  {generateSummary.isPending ? (
    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
  ) : (
    <><Sparkles className="w-4 h-4 mr-2" /> Generate AI Summary</>
  )}
</Button>
```

### 2. **React Query Mutation**
Location: `/home/user/bharat-crm/src/hooks/useCalls.ts` (lines 195-209)

```typescript
export function useGenerateCallSummary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => generateCallSummary(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callLogs'] });
      queryClient.invalidateQueries({ queryKey: ['callLog'] });
      toast.success('AI summary has been generated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to generate summary');
    },
  });
}
```

### 3. **API Call**
Location: `/home/user/bharat-crm/src/lib/calls-api.ts` (lines 271-275)

```typescript
export async function generateCallSummary(id: string) {
  return fetchAPI(`/calls/logs/${id}/generate-summary`, {
    method: 'POST',
  });
}
```

### 4. **Display Summary**
Location: `/home/user/bharat-crm/src/pages/calls/CallLogs.tsx` (lines 350-372)

```tsx
{selectedCall.summary ? (
  <div className="space-y-2">
    <p className="text-sm font-medium flex items-center gap-2">
      <Sparkles className="w-4 h-4 text-yellow-500" />
      AI Summary
    </p>
    <div className="bg-blue-50 p-4 rounded-lg text-sm">
      {selectedCall.summary}
    </div>
  </div>
) : selectedCall.transcript && (
  <Button onClick={() => generateSummary.mutate(selectedCall.id)}>
    Generate AI Summary
  </Button>
)}
```

## Why the Button Might Not Be Working

### **Issue 1: OpenAI Not Configured**
**Symptom:** Button doesn't generate summary, shows error
**Cause:** Tenant doesn't have OpenAI API key configured
**Solution:** Configure OpenAI API key in Call Settings

**Check:**
```sql
SELECT openaiApiKey FROM CallSettings WHERE tenantId = 'your-tenant-id';
```

### **Issue 2: No Transcript Available**
**Symptom:** Error: "CallLog or transcript not found"
**Cause:** Call log doesn't have a transcript
**Solution:** Ensure the call has been transcribed (requires Twilio transcription)

**Check:**
```sql
SELECT transcript FROM CallLog WHERE id = 'call-log-id';
```

### **Issue 3: Summary Doesn't Appear in Dialog**
**Symptom:** Summary generated but modal doesn't update
**Cause:** Modal doesn't re-fetch after mutation
**Solution:** Query invalidation should trigger re-fetch

### **Issue 4: Permission Error**
**Symptom:** 404 or 403 error
**Cause:** Call log doesn't belong to user's tenant
**Solution:** Ensure tenant context is correct

## Current Flow (Saves to Database)

```
User clicks "Generate AI Summary"
         ↓
Frontend calls POST /api/calls/logs/:id/generate-summary
         ↓
Backend fetches call log and transcript
         ↓
Backend calls OpenAI API with system + user prompts
         ↓
OpenAI returns summary (~300 tokens)
         ↓
Backend SAVES summary to database
         ↓
Backend returns updated call log
         ↓
Frontend invalidates queries
         ↓
Frontend re-fetches call log
         ↓
Modal displays summary from database
```

## Requested Change: Show in Dialog Without Saving

To show the summary in the dialog **without saving to the database**, we need to:

1. Create a new endpoint: `POST /api/calls/logs/:id/preview-summary`
2. Modify the frontend to store summary in local state
3. Display summary in a dedicated section

See the implementation in the code changes below.

## Example Summary Output

**Input Transcript:**
```
[2026-01-11T10:30:00Z]
User: Hi, I'm interested in your CRM software
AI: Great! I'd be happy to help. What features are you looking for?

[2026-01-11T10:30:30Z]
User: I need WhatsApp integration and AI features
AI: Perfect! Our CRM includes native WhatsApp Business API integration and AI-powered features...
```

**Generated Summary:**
```
**Call Summary:**

The prospect expressed interest in CRM software, specifically requiring:
- WhatsApp integration
- AI-powered features

**Key Points:**
- Customer is actively searching for a solution
- Specific feature requirements identified
- Positive engagement throughout the call

**Next Steps:**
- Send product demo
- Schedule follow-up meeting
- Provide WhatsApp integration details

**Sentiment:** Positive
```

## Cost Calculation

The system tracks AI usage costs:

**Model Pricing (per 1,000 tokens):**
- `gpt-4o-mini`: Input $0.00015, Output $0.0006
- `gpt-4o`: Input $0.005, Output $0.015

**Example Cost:**
- Transcript: 500 tokens (input)
- Summary: 200 tokens (output)
- Model: gpt-4o-mini
- **Total Cost:** ~$0.00019 per summary

Costs are stored in the `aiCost` field of the CallLog.

## Debugging

### Enable Detailed Logging

Add this to the backend to see what's happening:

```javascript
console.log('[CALL SUMMARY] Starting generation for:', callLogId);
console.log('[CALL SUMMARY] Transcript length:', callLog.transcript?.length);
console.log('[CALL SUMMARY] OpenAI model:', settings.openaiModel);
console.log('[CALL SUMMARY] Generated summary:', summary);
```

### Check Browser Console

Look for errors in the browser console:
- Network errors (check Network tab)
- API errors (check response)
- React Query errors

### Test API Directly

```bash
curl -X POST http://localhost:3001/api/calls/logs/CALL_LOG_ID/generate-summary \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

## Enhancement Ideas

### Better Prompts
```javascript
// More structured output
const systemPrompt = `You are an expert sales call analyzer. Summarize the call transcript in this exact format:

**Main Topics:** [List 2-3 main topics discussed]

**Customer Needs:** [List specific needs/pain points mentioned]

**Action Items:** [List next steps]

**Sentiment:** [Positive/Neutral/Negative with brief reason]

Keep it concise and actionable.`;
```

### Multi-language Support
```javascript
// Detect language and summarize accordingly
const userPrompt = `Summarize this call transcript. Detect the language and provide the summary in the same language:\n\n${transcript}`;
```

### Custom Summary Types
```javascript
// Different summary types
const summaryTypes = {
  brief: { maxTokens: 150, focus: 'key points only' },
  detailed: { maxTokens: 500, focus: 'comprehensive analysis' },
  actionItems: { maxTokens: 200, focus: 'next steps and tasks' }
};
```

---

## Files Reference

**Backend:**
- `/backend/routes/calls.js` - API endpoints
- `/backend/services/callService.js` - Business logic
- `/backend/services/openai.js` - OpenAI integration (if exists)

**Frontend:**
- `/src/pages/calls/CallLogs.tsx` - UI with button
- `/src/hooks/useCalls.ts` - React Query hooks
- `/src/lib/calls-api.ts` - API client functions

**Database:**
- Table: `CallLog`
- Fields: `transcript`, `summary`, `aiTokensUsed`, `aiCost`
- Table: `CallSettings`
- Fields: `openaiApiKey`, `openaiModel`
