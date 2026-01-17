# AI Demo Scheduling Automation

**Enterprise-Level Feature for Bharat CRM**

## Overview

The AI Demo Scheduling Automation is a cutting-edge, enterprise-level feature that automatically extracts demo/meeting requests from AI call transcripts and creates calendar events with the lead's information. This feature is exclusive to **PROFESSIONAL** and **ENTERPRISE** subscription plans.

## How It Works

### Automated Workflow

1. **AI Call Completion**: When an AI-powered call ends, the system receives the call transcript
2. **AI Analysis**: Our GPT-4o-mini powered AI analyzes the transcript to detect:
   - If a demo or meeting was requested
   - Whether the lead agreed to the meeting
   - Date and time mentioned (supports various formats including relative dates like "tomorrow", "next Monday")
   - Meeting type (demo, meeting, call, appointment)
   - Duration and preferences
   - Confidence score (0-100%)

3. **Data Extraction**: The AI extracts structured data including:
   - Meeting agreement status
   - Proposed date and time
   - Meeting type and duration
   - Lead preferences and notes
   - Reason for decline (if applicable)

4. **Calendar Automation**: If the lead agreed and confidence is above threshold:
   - Automatically creates a Google Calendar event
   - Includes lead information in the event
   - Sends calendar invite to the lead (if enabled)
   - Adds reminders (24 hours and 30 minutes before)

5. **Notification**: User is notified when a demo is scheduled (if enabled)

## Features

### Core Capabilities

- **Intelligent Transcript Analysis**: Uses OpenAI GPT-4o-mini for accurate extraction
- **Multi-Format Date/Time Parsing**: Understands relative dates ("tomorrow", "next week") and absolute dates
- **Confidence Scoring**: Only auto-books meetings when AI is sufficiently confident (configurable threshold)
- **Google Calendar Integration**: Seamlessly creates events in user's calendar
- **Lead Information Inclusion**: Event includes all lead details (name, email, phone, company)
- **Automatic Invite Sending**: Can send Google Calendar invites to leads
- **Cost Tracking**: Tracks OpenAI API usage and costs per extraction

### Configurable Settings

All settings are managed in **Call Settings > AI Demo Scheduling Automation**:

1. **Enable Demo Scheduling** (ON/OFF)
   - Master toggle for the entire feature

2. **Auto-Book Calendar Events** (ON/OFF)
   - Automatically create calendar events when demo is agreed
   - If OFF, only extraction data is saved (no calendar booking)

3. **Minimum Confidence Score** (0-100%, default: 70%)
   - Only auto-book when AI confidence is above this threshold
   - Recommended: 70% for balance between automation and accuracy

4. **Notify User** (ON/OFF)
   - Send notification when demo is scheduled

5. **Send Calendar Invite to Lead** (ON/OFF)
   - Automatically send Google Calendar invite to the lead's email
   - Requires lead to have valid email address

## Architecture

### Backend Components

#### 1. AI Service (`backend/services/ai/demoSchedulingAI.service.js`)
- Analyzes call transcripts using OpenAI GPT-4o-mini
- Extracts meeting scheduling information
- Formats data for calendar events
- Calculates extraction costs
- Validates subscription plan access

**Key Methods:**
```javascript
extractMeetingFromTranscript(transcript, callContext)
formatAsCalendarEvent(meetingInfo, leadData, callData)
validateFeatureAccess(tenantId)
calculateExtractionCost(tokensUsed, model)
```

#### 2. Automation Service (`backend/services/demoSchedulingAutomation.service.js`)
- Orchestrates the complete automation workflow
- Integrates AI extraction with calendar booking
- Manages feature access and settings
- Provides statistics and analytics

**Key Methods:**
```javascript
processCallForDemoScheduling(callLogId, userId, tenantId)
checkFeatureAccess(tenantId)
createCalendarEvent(meetingInfo, callLog, userId, tenantId, settings)
getStatistics(tenantId, startDate, endDate)
```

#### 3. Webhook Handlers (`backend/routes/calls.js`)
- Triggered automatically after call completion
- Runs in background (non-blocking)
- Triggered from two webhooks for reliability:
  - Status webhook (when call completed)
  - Transcription webhook (when transcript available)

### Database Schema

#### CallLog Extensions
```prisma
model CallLog {
  // Demo/Meeting Scheduling (Enterprise Feature)
  meetingExtracted       Boolean? @default(false)
  hasMeetingRequest      Boolean? @default(false)
  meetingAgreed          Boolean? @default(false)
  meetingType            String?  // 'demo' | 'meeting' | 'call' | 'appointment'
  meetingProposedDate    DateTime?
  meetingProposedTime    String?  // HH:MM format
  meetingDateTimeText    String?  // Original text from transcript
  meetingDuration        Int?     // Minutes
  meetingPreferences     String? @db.Text
  meetingNotes           String? @db.Text
  meetingConfidence      Int?     // 0-100
  meetingReasonDeclined  String? @db.Text
  meetingCalendarEventId String?  // Google Calendar event ID
  meetingExtractionCost  Float?   // USD
}
```

#### CallSettings Extensions
```prisma
model CallSettings {
  // Demo Scheduling Automation (PROFESSIONAL/ENTERPRISE Feature)
  enableDemoScheduling       Boolean @default(false)
  demoSchedulingAutoBook     Boolean @default(true)
  demoSchedulingMinConfidence Int    @default(70)
  demoSchedulingCalendarId   String?
  demoSchedulingNotifyUser   Boolean @default(true)
  demoSchedulingNotifyLead   Boolean @default(true)
}
```

### Frontend Components

#### 1. Call Settings Page (`src/pages/calls/CallSettings.tsx`)
- Dedicated section for Demo Scheduling Automation
- PRO badge indicating enterprise feature
- Comprehensive controls for all settings
- Visual feedback with gradient card design
- Helpful tips and instructions

#### 2. Call Logs Page (`src/pages/calls/CallLogs.tsx`)
- Beautiful display of extracted meeting information
- Shows agreement status with visual indicators
- Displays all meeting details (type, date, time, duration)
- Shows original transcript quote
- Indicates if calendar event was created
- Shows AI confidence score

### API Endpoints

#### 1. POST `/api/calls/logs/:id/extract-meeting`
Manually trigger meeting extraction for a specific call.

**Authentication**: Required
**Permission**: PROFESSIONAL/ENTERPRISE plan
**Response**:
```json
{
  "success": true,
  "result": {
    "meetingInfo": { ... },
    "calendarEvent": { ... },
    "autoBooked": true
  }
}
```

#### 2. GET `/api/calls/demo-scheduling/stats`
Get demo scheduling automation statistics.

**Authentication**: Required
**Permission**: PROFESSIONAL/ENTERPRISE plan
**Query Parameters**:
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string

**Response**:
```json
{
  "success": true,
  "stats": {
    "total": 100,
    "withMeetingRequest": 45,
    "agreed": 30,
    "autoBooked": 28,
    "conversionRate": "30.00",
    "autoBookRate": "93.33",
    "totalCost": 0.045
  }
}
```

## Subscription Plan Access

### Feature Availability

| Plan | Demo Scheduling | Auto-Booking | AI Analysis |
|------|----------------|--------------|-------------|
| FREE (Trial) | ✅ Yes (25 days) | ✅ Yes | ✅ Yes |
| STANDARD | ❌ No | ❌ No | ❌ No |
| PROFESSIONAL | ✅ Yes | ✅ Yes | ✅ Yes |
| ENTERPRISE | ✅ Yes | ✅ Yes | ✅ Yes |

### Access Validation
The feature includes built-in subscription plan validation:
- Checks tenant plan before processing
- Returns helpful error messages for non-eligible plans
- Frontend shows PRO badge to indicate enterprise feature

## Calendar Integration

### Requirements
1. User must have Google Calendar connected
2. Valid OAuth2 tokens must be present
3. Lead must have email address (for sending invites)

### Event Format
```
Title: Demo - [Lead Name]
Description: Automatically scheduled from AI call with full context
Start: [Extracted Date/Time or default to tomorrow 10 AM]
End: [Start + Duration (30-60 minutes)]
Attendees: [Lead Email]
Reminders: 24 hours before, 30 minutes before
Location: Online Demo (for demo type)
```

## AI Prompt Engineering

The system uses a carefully crafted prompt that:
1. Provides clear instructions for extraction
2. Includes call context (date, lead info)
3. Requests structured JSON output
4. Handles various date/time formats
5. Conservative approach to "agreed" status
6. Extracts confidence score

**Sample Prompt Structure**:
```
System: You are an expert AI assistant that analyzes sales call transcripts...
- Determine if a demo or meeting was requested
- Identify if the lead agreed
- Extract date and time
- Understand various formats
- Return structured JSON

User: [Transcript with context]

Expected Output: JSON with all fields
```

## Cost Management

### AI Extraction Costs
- Model: GPT-4o-mini (cost-effective)
- Average tokens per extraction: 500-1000
- Cost per extraction: ~$0.0003 - $0.0006 USD
- Costs are tracked and stored per call

### Monthly Cost Estimate
For 1000 calls/month with 50% having meeting requests:
- 500 extractions × $0.0005 = **$0.25/month**

## Error Handling

### Graceful Degradation
- If OpenAI API fails: Logs error, doesn't block call completion
- If calendar creation fails: Logs error, saves extraction data
- If no transcript: Skips processing
- If lead declined: Saves reason, doesn't book calendar

### Retry Logic
- Uses `setImmediate` for background processing
- Prevents duplicate processing with `meetingExtracted` flag
- Non-blocking webhook responses

## Security & Privacy

### Data Protection
1. **Tenant Isolation**: All data is tenant-scoped
2. **API Key Security**: OpenAI keys stored encrypted in database
3. **OAuth Tokens**: Secure token storage for Google Calendar
4. **GDPR Compliance**: Transcripts and meeting data can be deleted

### Access Control
1. **Authentication Required**: All endpoints require valid JWT
2. **Subscription Validation**: Feature access based on plan
3. **Tenant Context**: Middleware ensures tenant isolation

## Usage Examples

### Example 1: Successful Demo Booking

**Call Transcript**:
```
Agent: "Would you like to schedule a demo of our CRM?"
Lead: "Yes, that would be great! How about tomorrow at 2 PM?"
Agent: "Perfect! I'll send you a calendar invite for tomorrow at 2 PM."
```

**Extracted Data**:
```json
{
  "hasMeetingRequest": true,
  "agreed": true,
  "meetingType": "demo",
  "proposedDateTime": "2026-01-18T14:00:00.000Z",
  "dateTimeText": "tomorrow at 2 PM",
  "confidence": 95,
  "notes": "Lead enthusiastic about demo"
}
```

**Result**: Calendar event created for Jan 18, 2026 at 2:00 PM

### Example 2: Meeting Declined

**Call Transcript**:
```
Agent: "Can we schedule a demo for next week?"
Lead: "I'm actually quite busy right now. Maybe in a few months."
Agent: "No problem, I'll follow up later."
```

**Extracted Data**:
```json
{
  "hasMeetingRequest": true,
  "agreed": false,
  "confidence": 90,
  "reasonForDecline": "Too busy, wants to be contacted in a few months"
}
```

**Result**: No calendar event created, data saved for follow-up

## Monitoring & Analytics

### Key Metrics
1. **Total Calls Processed**: Number of calls analyzed
2. **Meeting Requests**: How many calls had meeting requests
3. **Agreement Rate**: % of meeting requests that were agreed
4. **Auto-Book Rate**: % of agreed meetings that were auto-booked
5. **Total Cost**: Cumulative OpenAI API costs

### Viewing Statistics
Access via API: `GET /api/calls/demo-scheduling/stats?startDate=2026-01-01&endDate=2026-01-31`

## Troubleshooting

### Common Issues

#### 1. "Feature not available"
- **Cause**: Not on PROFESSIONAL or ENTERPRISE plan
- **Solution**: Upgrade subscription plan

#### 2. Calendar event not created
- **Possible Causes**:
  - Google Calendar not connected
  - Confidence score below threshold
  - Lead doesn't have email
- **Solution**: Check Call Settings, connect calendar, verify lead email

#### 3. Incorrect date/time extracted
- **Cause**: Ambiguous date reference in transcript
- **Solution**: Train callers to be specific about dates

#### 4. No extraction happening
- **Possible Causes**:
  - Feature disabled in settings
  - No transcript available
  - Call didn't complete successfully
- **Solution**: Enable feature, ensure recording/transcription enabled

## Best Practices

### For Sales Reps
1. **Be Specific**: Use clear date/time references ("Tuesday, January 21st at 3 PM")
2. **Confirm Agreement**: Get explicit confirmation ("Does that work for you?")
3. **State Duration**: Mention meeting length ("30-minute demo")
4. **Note Preferences**: Capture any preferences ("Morning works better for me")

### For Admins
1. **Set Appropriate Threshold**: Start with 70% confidence, adjust based on accuracy
2. **Monitor Statistics**: Review monthly stats to optimize
3. **Review Extractions**: Periodically check extraction accuracy
4. **Manage Costs**: Track OpenAI usage and costs

## Future Enhancements

Potential improvements for future versions:

1. **Multi-Language Support**: Extract meetings from calls in different languages
2. **Timezone Detection**: Automatically detect and convert timezones
3. **Conflict Detection**: Check for calendar conflicts before booking
4. **Smart Rescheduling**: Handle rescheduling requests from follow-up calls
5. **Integration with Tasks**: Create follow-up tasks based on meeting outcomes
6. **Email Confirmations**: Send custom email confirmations to leads
7. **SMS Reminders**: Send SMS reminders before meetings
8. **Meeting Preparation**: Auto-generate meeting agendas based on call context

## Support

For issues or questions:
1. Check Call Settings to ensure feature is enabled
2. Review Call Logs to see extraction results
3. Check API documentation for technical details
4. Contact support for subscription plan questions

---

**Version**: 1.0.0
**Last Updated**: January 17, 2026
**License**: Enterprise Feature - PROFESSIONAL/ENTERPRISE plans only
