/**
 * Preview Summary Route - Shows summary without saving to database
 * Add this to the main calls.js file after the generate-summary route
 */

/**
 * POST /api/calls/logs/:id/preview-summary
 * Generate AI summary preview without saving to database
 * Returns summary directly for display in dialog
 */
router.post('/logs/:id/preview-summary', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    console.log(`[CALLS API] Generating summary preview for call:`, id);

    // Verify ownership
    const callLog = await prisma.callLog.findFirst({
      where: { id, tenantId },
      include: {
        lead: true,
        contact: true
      }
    });

    if (!callLog) {
      return res.status(404).json({ error: 'Call log not found' });
    }

    if (!callLog.transcript || callLog.transcript.trim() === '') {
      return res.status(400).json({
        error: 'No transcript available for this call. The call must be completed and transcribed first.'
      });
    }

    // Get tenant's OpenAI settings
    const settings = await prisma.callSettings.findUnique({
      where: { tenantId }
    });

    if (!settings || !settings.openaiApiKey) {
      return res.status(400).json({
        error: 'OpenAI API key not configured. Please configure it in Call Settings.'
      });
    }

    console.log(`[CALLS API] Using OpenAI model:`, settings.openaiModel || 'gpt-4o-mini');
    console.log(`[CALLS API] Transcript length:`, callLog.transcript.length);

    // Generate summary using OpenAI
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: settings.openaiApiKey });

    const completion = await openai.chat.completions.create({
      model: settings.openaiModel || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert sales call analyzer. Summarize the call transcript in this format:

**Main Topics:** [List 2-3 main topics discussed]

**Customer Needs/Concerns:** [List specific needs or concerns mentioned]

**Key Points:** [Important highlights from the conversation]

**Next Steps:** [Recommended action items and follow-ups]

**Sentiment:** [Positive/Neutral/Negative] - [Brief reason]

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

    console.log(`[CALLS API] Summary generated - Tokens: ${tokensUsed}, Cost: $${cost.toFixed(6)}`);

    // Return summary without saving to database
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
    console.error('[CALLS API] Error generating summary preview:', error);

    // Better error messages
    if (error.code === 'insufficient_quota') {
      return res.status(400).json({
        error: 'OpenAI API quota exceeded. Please check your OpenAI account.'
      });
    }

    if (error.code === 'invalid_api_key') {
      return res.status(400).json({
        error: 'Invalid OpenAI API key. Please check your Call Settings.'
      });
    }

    res.status(500).json({
      error: error.message || 'Failed to generate summary. Please try again.'
    });
  }
});
