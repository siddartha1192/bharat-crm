# AI WhatsApp Assistant Integration - Complete Guide

## 📋 Overview

This document describes the complete AI-powered WhatsApp assistant integration for Bharat CRM. The AI assistant can:
- Answer questions about Bharat CRM products and features
- Explain benefits and capabilities to prospects
- Book appointments automatically by collecting customer details
- Create Google Calendar events for booked appointments
- Be enabled/disabled per conversation or globally

## 🎯 Features Implemented

### 1. **AI Product Knowledge**
- Comprehensive knowledge base about all Bharat CRM features
- Answers questions about WhatsApp Integration, Lead Management, Email System, Invoicing, etc.
- Highlights benefits specific to Indian businesses
- Industry-specific information

### 2. **Appointment Booking**
- AI detects when customer wants to schedule a meeting/demo
- Collects required information:
  - Customer Name
  - Email Address
  - Phone Number
  - Company Name (optional)
  - Preferred Date and Time
- Automatically creates Google Calendar event
- Sends event to customer email and owner email (siddartha1192@gmail.com)

### 3. **AI Control Options**
- **Global Toggle**: Environment variable `ENABLE_AI_FEATURE` to disable AI completely
- **Per-Conversation Toggle**: Each WhatsApp chat has an AI on/off button
- **Manual Override**: You can respond manually even when AI is enabled
- **Visual Indicators**: AI-generated messages are marked differently

## 📁 Files Created/Modified

### Backend Files Created:
1. **`backend/services/openai.js`** - Complete AI service with:
   - Product knowledge base
   - OpenAI API integration
   - Appointment data extraction
   - Google Calendar event creation

### Backend Files Modified:
2. **`backend/prisma/schema.prisma`** - Added fields:
   - `WhatsAppConversation.aiEnabled` (Boolean) - Per-conversation AI toggle
   - `WhatsAppMessage.isAiGenerated` (Boolean) - Flag for AI messages
   - `WhatsAppMessage.sender` - Now includes 'ai' option

3. **`backend/routes/whatsapp.js`** - Added:
   - AI processing in webhook (`processIncomingMessage`)
   - `PATCH /whatsapp/conversations/:id/ai-toggle` - Toggle AI per conversation
   - `GET /whatsapp/ai-status` - Check if AI is globally enabled

### Frontend Files to Update:
4. **`src/pages/WhatsApp.tsx`** - Needs:
   - AI toggle button in chat header
   - Visual indicator for AI-generated messages
   - State management for AI status

## 🔧 Environment Variables

Add these to your `.env` file:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
# Options: gpt-4, gpt-4o, gpt-4o-mini (recommended for cost), gpt-3.5-turbo

# AI Feature Control
ENABLE_AI_FEATURE=true
# Set to 'false' to disable AI completely across the platform

# Owner Configuration (for appointments)
OWNER_EMAIL=siddartha1192@gmail.com

# Existing Gmail/Google Configuration (already set)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GMAIL_REFRESH_TOKEN=your_gmail_refresh_token
GMAIL_REDIRECT_URI=https://developers.google.com/oauthplayground
```

## 📦 Package Installation

Install the OpenAI package in your backend:

```bash
cd backend
npm install openai
```

## 🗄️ Database Migration

Run Prisma migration to add AI fields:

```bash
cd backend
npx prisma migrate dev --name add_whatsapp_ai_fields
npx prisma generate
```

## 🎨 Frontend Implementation (To Be Added)

Update `src/pages/WhatsApp.tsx` with the following changes:

### 1. Add AI state and imports:

```typescript
import { Bot, BotOff } from 'lucide-react'; // Add to imports

// Add to Conversation interface
interface Conversation {
  // ... existing fields
  aiEnabled: boolean; // NEW
}

// Add to Message interface
interface Message {
  // ... existing fields
  isAiGenerated?: boolean; // NEW
}

// Add state in component
const [aiFeatureAvailable, setAiFeatureAvailable] = useState(false);

// Check AI feature status on mount
useEffect(() => {
  checkAIStatus();
}, []);

const checkAIStatus = async () => {
  try {
    const response = await fetch(`${API_URL}/whatsapp/ai-status`, {
      headers: { 'X-User-Id': userId || '' },
    });
    const data = await response.json();
    setAiFeatureAvailable(data.aiFeatureEnabled);
  } catch (error) {
    console.error('Error checking AI status:', error);
  }
};

const toggleAI = async () => {
  if (!selectedConversation) return;

  try {
    const response = await fetch(
      `${API_URL}/whatsapp/conversations/${selectedConversation.id}/ai-toggle`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId || '',
        },
        body: JSON.stringify({ enabled: !selectedConversation.aiEnabled }),
      }
    );

    const data = await response.json();

    if (data.success) {
      setSelectedConversation(prev =>
        prev ? { ...prev, aiEnabled: data.aiEnabled } : null
      );
      toast({
        title: `AI Assistant ${data.aiEnabled ? 'Enabled' : 'Disabled'}`,
        description: data.message,
      });
      fetchConversations(false); // Refresh conversation list
    }
  } catch (error) {
    toast({
      title: 'Error',
      description: 'Failed to toggle AI assistant',
      variant: 'destructive',
    });
  }
};
```

### 2. Add AI Toggle Button in Chat Header (line ~490):

```typescript
<div className="flex items-center gap-2">
  {aiFeatureAvailable && (
    <Button
      size="sm"
      variant={selectedConversation.aiEnabled ? "default" : "outline"}
      onClick={toggleAI}
      title={selectedConversation.aiEnabled ? "AI Assistant Enabled" : "AI Assistant Disabled"}
    >
      {selectedConversation.aiEnabled ? (
        <>
          <Bot className="w-4 h-4 mr-2" />
          AI On
        </>
      ) : (
        <>
          <BotOff className="w-4 h-4 mr-2" />
          AI Off
        </>
      )}
    </Button>
  )}
  <Button size="sm" variant="ghost">
    <Phone className="w-4 h-4" />
  </Button>
  {/* ... existing dropdown menu */}
</div>
```

### 3. Update Message Display to Show AI Messages (line ~516):

```typescript
{messages.map(msg => (
  <div
    key={msg.id}
    className={`flex ${msg.sender === 'user' || msg.sender === 'ai' ? 'justify-end' : 'justify-start'}`}
  >
    <div
      className={`max-w-[70%] rounded-lg p-3 ${
        msg.sender === 'user'
          ? 'bg-green-600 text-white'
          : msg.isAiGenerated
          ? 'bg-blue-600 text-white' // AI messages in blue
          : 'bg-accent text-foreground' // Customer messages
      }`}
    >
      {(msg.sender === 'contact' || msg.isAiGenerated) && (
        <p className="text-xs font-semibold mb-1 flex items-center gap-1">
          {msg.isAiGenerated && <Bot className="w-3 h-3" />}
          {msg.senderName}
        </p>
      )}
      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
      {/* ... existing timestamp code */}
    </div>
  </div>
))}
```

## 🚀 How It Works

### Workflow:

1. **Customer sends WhatsApp message** → WhatsApp webhook receives it
2. **System checks**: Is AI globally enabled? Is AI enabled for this conversation?
3. **If AI is enabled**:
   - Fetches recent conversation history (last 10 messages)
   - Sends to OpenAI with product knowledge base
   - OpenAI generates response about Bharat CRM
4. **If appointment intent detected**:
   - AI extracts customer details (name, email, date, time)
   - Creates Google Calendar event automatically
   - Sends calendar invite to customer and owner
   - Confirms appointment in WhatsApp response
5. **AI response sent back** via WhatsApp
6. **Message saved** with `isAiGenerated=true` flag

### Manual Override:

- Even when AI is ON, you can manually send messages
- Your manual messages are sent immediately
- AI won't respond to messages you already answered
- Toggle AI OFF anytime to take over the conversation

## 🎯 Product Knowledge Examples

The AI knows about:

1. **WhatsApp Integration** - Direct messaging, conversation history
2. **Lead Management** - Pipeline tracking, follow-ups, priorities
3. **Email System** - Gmail integration, reply tracking, templates
4. **Invoicing** - GST-compliant, multiple payment methods
5. **Calendar** - Google Calendar sync, meeting scheduling
6. **Deal Pipeline** - Stage tracking, probability scoring
7. **Team Management** - Roles, departments, activity logs
8. **And more...**

## 💬 Example Conversation:

**Customer**: "Hi, I want to know about your CRM"

**AI**: "Hello! Bharat CRM is a comprehensive business management platform designed specifically for Indian businesses. We offer:

✅ WhatsApp Integration (you're using it now!)
✅ Lead & Contact Management
✅ Gmail Integration with email tracking
✅ GST-compliant Invoicing
✅ Google Calendar Integration
✅ Deal Pipeline Management
✅ Team Collaboration Tools

What specific features would you like to learn more about?"

**Customer**: "How much does it cost? Can we schedule a demo?"

**AI**: "I'd be happy to schedule a demo for you! Our pricing is customized based on your business needs.

To book a demo, I'll need:
- Your full name
- Email address
- Company name (optional)
- Preferred date and time

Could you please provide these details?"

**Customer**: "My name is Rahul Sharma, email rahul@example.com, company XYZ Ltd. Tomorrow at 2 PM works for me"

**AI**: "Perfect! Let me confirm those details:
- Name: Rahul Sharma
- Email: rahul@example.com
- Company: XYZ Ltd
- Date: Tomorrow at 2 PM

✅ **Appointment Confirmed!**
📅 Tomorrow, 2:00 PM IST

You'll receive a calendar invite at rahul@example.com. Looking forward to showing you how Bharat CRM can transform your business!"

*[System automatically creates Google Calendar event and sends invite]*

## 🔒 Security & Privacy

- OpenAI API calls are made server-side only
- Customer data is only used for appointment booking
- Calendar events include minimal necessary information
- AI responses are logged in database for audit
- Environment variable controls global AI access

## 💰 Cost Management

Using `gpt-4o-mini` (recommended):
- ~1000 WhatsApp messages = ~$0.50 USD
- Very cost-effective for business use
- Responses are limited to 500 tokens to keep costs low

Alternative models:
- `gpt-3.5-turbo`: Cheaper but less accurate
- `gpt-4o`: More expensive but highest quality
- `gpt-4`: Most expensive, best for complex queries

## 🐛 Troubleshooting

### AI not responding:
1. Check `ENABLE_AI_FEATURE=true` in `.env`
2. Verify `OPENAI_API_KEY` is valid
3. Check conversation has `aiEnabled=true`
4. View backend logs for errors

### Appointments not creating:
1. Verify Google Calendar OAuth is configured
2. Check `GMAIL_REFRESH_TOKEN` has calendar permissions
3. Ensure `OWNER_EMAIL` matches Google account
4. Check backend logs for calendar API errors

### Wrong responses:
1. Review product knowledge in `backend/services/openai.js`
2. Adjust `SYSTEM_PROMPT` for better guidance
3. Change `temperature` (0.7 = balanced, 0.3 = focused)
4. Use a better model (gpt-4o instead of gpt-4o-mini)

## 📊 Monitoring

Check backend logs for:
- `🤖 AI is enabled for conversation...` - AI processing started
- `🤖 AI Response: ...` - Generated response
- `✅ AI response sent and saved` - Success
- `❌ Error generating AI response:` - Failures

## 🎛️ Global AI Control

To disable AI completely across the platform:

```env
ENABLE_AI_FEATURE=false
```

This immediately:
- Stops all AI processing
- Hides AI toggle buttons in UI
- Returns error if API calls try to use AI
- No OpenAI API calls are made

To re-enable, change back to `true` and restart server.

## 🚦 Next Steps

1. **Install openai package**: `npm install openai`
2. **Run database migration**: `npx prisma migrate dev`
3. **Add environment variables** to `.env`
4. **Update frontend** WhatsApp.tsx with AI toggle button
5. **Test** with a WhatsApp conversation
6. **Monitor** costs in OpenAI dashboard
7. **Customize** product knowledge as needed

## 📝 Notes

- AI responses are generated in real-time (~2-5 seconds)
- Conversation history provides context for better responses
- AI won't answer non-CRM questions (redirects to booking)
- You can customize the system prompt in `openai.js`
- Appointment parsing uses simple regex (can be improved)

## ✅ Completed

- ✅ Prisma schema updated
- ✅ OpenAI service created with product knowledge
- ✅ WhatsApp webhook integrated with AI
- ✅ Appointment booking with calendar creation
- ✅ Per-conversation AI toggle API
- ✅ Global AI enable/disable via env variable
- ✅ AI message tracking and logging

## ⏳ Pending

- ⏳ Frontend AI toggle button (code provided above)
- ⏳ Visual indicators for AI messages (code provided above)
- ⏳ Install openai npm package
- ⏳ Database migration
- ⏳ Environment variable configuration
- ⏳ Testing and deployment

