# AI Call Summary - Complete Fix and Explanation

## Executive Summary

The AI Call Summary feature generates summaries of call transcripts using OpenAI GPT. This document explains:
1. How the current system works
2. The prompts used (system and user prompts)
3. Why the button might not be working
4. How to fix it to show summary in dialog without saving to database

---

## Current System Explained

### System Architecture

```
Frontend (React) → API Call → Backend Route → Call Service → OpenAI API → Database
                                                                             ↓
                                                                      Save Summary
```

### **1. System Prompt** (Defines AI behavior)

**Location:** `/backend/services/callService.js` line 323

```javascript
{
  role: 'system',
  content: 'You are a helpful assistant that summarizes sales call transcripts. Provide a concise summary highlighting key points, customer concerns, next steps, and overall sentiment.'
}
```

**Purpose:**
- Tells AI what role to play
- Defines output format expectations
- Sets the context (sales calls)

### **2. User Prompt** (Provides the data)

**Location:** `/backend/services/callService.js` line 327

```javascript
{
  role: 'user',
  content: `Summarize this call transcript:\n\n${callLog.transcript}`
}
```

**Purpose:**
- Provides the actual transcript text
- Simple and direct instruction

### **3. Configuration**

```javascript
{
  model: 'gpt-4o-mini',      // Fast and cost-effective
  temperature: 0.5,           // Balanced creativity/consistency
  max_tokens: 300             // ~225 words summary
}
```

---

## Why the Button May Not Work

### Issue #1: OpenAI Not Configured ⚠️

**Symptom:** Error "OpenAI not configured"

**Cause:** Tenant doesn't have OpenAI API key in Call Settings

**Fix:**
```sql
-- Check if configured
SELECT openaiApiKey FROM CallSettings WHERE tenantId = 'your-tenant-id';

-- If NULL, configure in UI:
Settings → Call Settings → OpenAI API Key
```

### Issue #2: No Transcript Available ⚠️

**Symptom:** Error "CallLog or transcript not found"

**Cause:** The call doesn't have a transcript yet

**Why:**
- Call is still in progress
- Transcription failed
- Transcription not enabled in settings

**Fix:**
```sql
-- Check transcript
SELECT id, transcript, twilioStatus
FROM CallLog
WHERE id = 'call-log-id';

-- Enable transcription
UPDATE CallSettings
SET enableTranscription = true
WHERE tenantId = 'your-tenant-id';
```

### Issue #3: Summary Doesn't Appear ⚠️

**Symptom:** Button works but summary doesn't show

**Cause:** The dialog doesn't update after saving

**Current Flow:**
1. Button clicked
2. API saves summary to database
3. React Query invalidates cache
4. Dialog should re-render
5. **BUT**: If dialog doesn't re-fetch, summary won't show

---

## Solution: Show Summary in Dialog (No Database Save)

### Step 1: Add New Backend Endpoint

**File:** `/backend/routes/calls.js`

**Add this code after line 280 (after the existing generate-summary route):**

```javascript
/**
 * POST /api/calls/logs/:id/preview-summary
 * Generate AI summary preview WITHOUT saving to database
 * Perfect for showing in dialog immediately
 */
router.post('/logs/:id/preview-summary', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    console.log(`[PREVIEW SUMMARY] Starting for call:`, id);

    // 1. Verify ownership
    const callLog = await prisma.callLog.findFirst({
      where: { id, tenantId },
      include: { lead: true, contact: true }
    });

    if (!callLog) {
      return res.status(404).json({ error: 'Call log not found' });
    }

    // 2. Validate transcript exists
    if (!callLog.transcript || callLog.transcript.trim() === '') {
      return res.status(400).json({
        error: 'No transcript available. Call must be completed and transcribed first.'
      });
    }

    // 3. Get OpenAI settings
    const settings = await prisma.callSettings.findUnique({
      where: { tenantId }
    });

    if (!settings?.openaiApiKey) {
      return res.status(400).json({
        error: 'OpenAI API key not configured. Configure it in Call Settings.'
      });
    }

    console.log(`[PREVIEW SUMMARY] Model: ${settings.openaiModel || 'gpt-4o-mini'}, Transcript: ${callLog.transcript.length} chars`);

    // 4. Generate summary with OpenAI
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: settings.openaiApiKey });

    const completion = await openai.chat.completions.create({
      model: settings.openaiModel || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert sales call analyzer. Summarize the call transcript in this structured format:

**📋 Main Topics:** [List 2-3 main topics discussed]

**💡 Customer Needs/Concerns:** [Specific needs or concerns mentioned]

**⭐ Key Points:** [Important highlights from the conversation]

**✅ Next Steps:** [Recommended action items and follow-ups]

**😊 Sentiment:** [Positive/Neutral/Negative] - [Brief explanation why]

Keep it concise, actionable, and professional.`
        },
        {
          role: 'user',
          content: `Analyze and summarize this sales call transcript:\n\n${callLog.transcript}`
        }
      ],
      temperature: 0.5,
      max_tokens: 400
    });

    const summary = completion.choices[0].message.content;
    const tokensUsed = completion.usage.total_tokens;
    const cost = callService.calculateOpenAICost(completion.usage, settings.openaiModel || 'gpt-4o-mini');

    console.log(`[PREVIEW SUMMARY] ✅ Generated - Tokens: ${tokensUsed}, Cost: $${cost.toFixed(6)}`);

    // 5. Return summary WITHOUT saving to database
    res.json({
      success: true,
      summary,
      metadata: {
        tokensUsed,
        estimatedCost: cost,
        model: settings.openaiModel || 'gpt-4o-mini',
        transcriptLength: callLog.transcript.length
      }
    });

  } catch (error) {
    console.error('[PREVIEW SUMMARY] ❌ Error:', error);

    // User-friendly error messages
    if (error.code === 'insufficient_quota') {
      return res.status(400).json({
        error: 'OpenAI API quota exceeded. Please check your OpenAI account billing.'
      });
    }

    if (error.code === 'invalid_api_key') {
      return res.status(400).json({
        error: 'Invalid OpenAI API key. Please update it in Call Settings.'
      });
    }

    res.status(500).json({
      error: error.message || 'Failed to generate summary. Please try again.'
    });
  }
});
```

### Step 2: Add Frontend API Function

**File:** `/src/lib/calls-api.ts`

**Add this function after the `generateCallSummary` function (around line 275):**

```typescript
/**
 * Generate call summary preview (doesn't save to database)
 * Returns summary for immediate display in dialog
 */
export async function previewCallSummary(id: string): Promise<{
  success: boolean;
  summary: string;
  metadata: {
    tokensUsed: number;
    estimatedCost: number;
    model: string;
    transcriptLength: number;
  };
}> {
  return fetchAPI(`/calls/logs/${id}/preview-summary`, {
    method: 'POST',
  });
}
```

### Step 3: Add React Hook

**File:** `/src/hooks/useCalls.ts`

**Add this hook after `useGenerateCallSummary` (around line 209):**

```typescript
/**
 * Preview call summary without saving to database
 * Perfect for showing in dialog
 */
export function usePreviewCallSummary() {
  return useMutation({
    mutationFn: (id: string) => previewCallSummary(id),
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to generate summary');
    },
    // Don't invalidate queries since we're not saving to DB
  });
}
```

### Step 4: Update Frontend Component

**File:** `/src/pages/calls/CallLogs.tsx`

**Changes needed:**

1. **Add import at top:**
```typescript
import { usePreviewCallSummary } from '@/hooks/useCalls';
```

2. **Add state for preview summary (around line 60):**
```typescript
const [previewSummary, setPreviewSummary] = useState<string | null>(null);
const previewSummaryMutation = usePreviewCallSummary();
```

3. **Add handler function:**
```typescript
const handleGenerateSummary = async () => {
  if (!selectedCall) return;

  try {
    const result = await previewSummaryMutation.mutateAsync(selectedCall.id);
    setPreviewSummary(result.summary);
    toast.success(`Summary generated! Used ${result.metadata.tokensUsed} tokens (~$${result.metadata.estimatedCost.toFixed(6)})`);
  } catch (error) {
    // Error already handled by mutation
  }
};
```

4. **Update the summary display section (replace lines 350-372):**
```tsx
{/* Summary Section */}
<div className="space-y-2">
  <p className="text-sm font-medium flex items-center gap-2">
    <Sparkles className="w-4 h-4 text-yellow-500" />
    AI Summary
  </p>

  {/* Show existing saved summary */}
  {selectedCall.summary && !previewSummary && (
    <div className="bg-blue-50 p-4 rounded-lg text-sm border border-blue-200">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-blue-600 font-medium">Saved Summary</span>
      </div>
      <div className="whitespace-pre-wrap">{selectedCall.summary}</div>
    </div>
  )}

  {/* Show preview summary */}
  {previewSummary && (
    <div className="bg-green-50 p-4 rounded-lg text-sm border border-green-200">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-green-600 font-medium">AI Generated Summary (Preview)</span>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setPreviewSummary(null)}
        >
          <X className="w-3 h-3" />
        </Button>
      </div>
      <div className="whitespace-pre-wrap">{previewSummary}</div>
    </div>
  )}

  {/* Generate button - show only if transcript exists and no preview yet */}
  {selectedCall.transcript && !previewSummary && (
    <Button
      onClick={handleGenerateSummary}
      disabled={previewSummaryMutation.isPending}
      variant="outline"
      className="w-full"
    >
      {previewSummaryMutation.isPending ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Generating AI Summary...
        </>
      ) : (
        <>
          <Sparkles className="w-4 h-4 mr-2" />
          Generate AI Summary
        </>
      )}
    </Button>
  )}

  {/* No transcript available */}
  {!selectedCall.transcript && !selectedCall.summary && (
    <p className="text-sm text-gray-500 italic">
      No transcript available. Transcription occurs after call completion.
    </p>
  )}
</div>
```

5. **Clear preview when modal closes:**
```typescript
// In the Dialog onOpenChange handler
<Dialog open={!!selectedCall} onOpenChange={(open) => {
  if (!open) {
    setSelectedCall(null);
    setPreviewSummary(null); // Clear preview when closing
  }
}}>
```

---

## Improved Prompts (Structured Output)

The new system prompt provides better structured output:

### System Prompt (Enhanced)
```
You are an expert sales call analyzer. Summarize the call transcript in this structured format:

**📋 Main Topics:** [List 2-3 main topics discussed]

**💡 Customer Needs/Concerns:** [Specific needs or concerns mentioned]

**⭐ Key Points:** [Important highlights from the conversation]

**✅ Next Steps:** [Recommended action items and follow-ups]

**😊 Sentiment:** [Positive/Neutral/Negative] - [Brief explanation why]

Keep it concise, actionable, and professional.
```

### Why This Is Better:
1. **Structured format** - Easy to scan
2. **Icons** - Visual organization
3. **Specific sections** - Covers all important aspects
4. **Actionable** - Focuses on next steps
5. **Sentiment with reasoning** - Not just positive/negative

---

## Example Output

### Input Transcript:
```
[2026-01-11T10:30:00Z]
User: Hi, I'm calling about your CRM software
AI: Hello! I'd be happy to help. What features are you most interested in?

[2026-01-11T10:30:45Z]
User: We need WhatsApp integration and AI capabilities
AI: Excellent! Our CRM includes native WhatsApp Business API integration...

[2026-01-11T10:32:15Z]
User: What about pricing for a team of 20 people?
AI: Great question! We have unlimited users, so you only pay for the platform...

[2026-01-11T10:34:30Z]
User: Sounds interesting. Can we schedule a demo?
AI: Absolutely! I'll send you a calendar link right now...
```

### Generated Summary:
```
**📋 Main Topics:**
- CRM software evaluation
- WhatsApp integration requirements
- Pricing for 20-person team
- Demo scheduling

**💡 Customer Needs/Concerns:**
- Native WhatsApp Business API integration
- AI-powered features
- Pricing transparency for larger teams
- Product demonstration before purchase

**⭐ Key Points:**
- Customer actively evaluating CRM solutions
- Team size: 20 people
- Budget-conscious (asked about per-user pricing)
- Positive response to unlimited users model
- Ready to move forward (requested demo)

**✅ Next Steps:**
- Send calendar link for demo scheduling
- Prepare WhatsApp integration demo
- Share pricing documentation
- Follow up within 24 hours

**😊 Sentiment:** Positive - Customer showed strong interest, asked detailed questions, and proactively requested a demo, indicating serious buying intent.
```

---

## Testing

### 1. Test API Endpoint Directly

```bash
curl -X POST 'http://localhost:3001/api/calls/logs/YOUR_CALL_ID/preview-summary' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json'
```

### 2. Check Browser Console

Look for:
- `[PREVIEW SUMMARY] Starting for call:`
- `[PREVIEW SUMMARY] ✅ Generated`
- Any error messages

### 3. Verify OpenAI Configuration

```sql
SELECT
  tenantId,
  openaiApiKey IS NOT NULL AS has_key,
  openaiModel,
  enableTranscription
FROM CallSettings
WHERE tenantId = 'your-tenant-id';
```

---

## Troubleshooting

### Error: "No transcript available"

**Solution:**
1. Wait for call to complete
2. Check `enableTranscription = true` in CallSettings
3. Verify Twilio transcription is working

### Error: "OpenAI API key not configured"

**Solution:**
1. Go to Settings → Call Settings
2. Add OpenAI API key
3. Test with any OpenAI command

### Error: "insufficient_quota"

**Solution:**
1. Check OpenAI billing at platform.openai.com
2. Add payment method
3. Increase quota limits

### Summary shows but then disappears

**Solution:**
- Make sure `previewSummary` state persists
- Don't clear it on re-render
- Only clear when dialog closes

---

## Cost Monitoring

The system tracks costs automatically:

```typescript
// Returned in metadata
{
  tokensUsed: 350,
  estimatedCost: 0.000210,  // $0.00021
  model: "gpt-4o-mini"
}
```

**Typical Costs:**
- Short call (2 min): ~200 tokens = $0.00012
- Medium call (5 min): ~500 tokens = $0.00030
- Long call (15 min): ~1500 tokens = $0.00090

**Monthly estimate for 1000 calls:**
- Average 500 tokens per call
- gpt-4o-mini
- **Total: ~$0.30/month**

Very affordable! 🎉

---

## Summary

### What Changed:
1. ✅ New endpoint `/preview-summary` that doesn't save to database
2. ✅ Better system prompt with structured output
3. ✅ Frontend shows summary in dialog immediately
4. ✅ Clear button to regenerate
5. ✅ Better error messages
6. ✅ Cost tracking displayed to user

### Benefits:
- 🚀 Instant summary display
- 💰 See costs upfront
- 🔄 Can regenerate without cluttering database
- 📊 Structured, scannable format
- ❌ Easy to dismiss and try again

### Next Steps:
1. Add the backend endpoint code
2. Update frontend components
3. Test with a real call transcript
4. Configure OpenAI API key if needed
5. Enjoy instant AI summaries! 🎉
