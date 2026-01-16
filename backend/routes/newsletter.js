const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');

const prisma = new PrismaClient();

/**
 * Subscribe to newsletter
 * POST /api/newsletter/subscribe
 * Public endpoint (no auth required)
 */
router.post('/subscribe', async (req, res) => {
  try {
    const { email, name, source } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if already subscribed
    const existing = await prisma.newsletterSubscription.findUnique({
      where: { email },
    });

    if (existing) {
      if (existing.isActive) {
        return res.status(400).json({ error: 'Email is already subscribed' });
      }

      // Reactivate subscription
      const updated = await prisma.newsletterSubscription.update({
        where: { email },
        data: {
          isActive: true,
          name: name || existing.name,
          subscribedAt: new Date(),
          unsubscribedAt: null,
          source: source || existing.source,
          ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
          userAgent: req.headers['user-agent'],
        },
      });

      return res.json({
        message: 'Successfully resubscribed to newsletter',
        subscription: {
          id: updated.id,
          email: updated.email,
          subscribedAt: updated.subscribedAt,
        },
      });
    }

    // Create new subscription
    const subscription = await prisma.newsletterSubscription.create({
      data: {
        email,
        name: name || null,
        source: source || 'unknown',
        ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        referrer: req.headers.referer || null,
      },
    });

    // TODO: Send welcome email to subscriber
    // TODO: Notify first admin (vicidas2021@gmail.com)

    res.json({
      message: 'Successfully subscribed to newsletter',
      subscription: {
        id: subscription.id,
        email: subscription.email,
        subscribedAt: subscription.subscribedAt,
      },
    });
  } catch (error) {
    console.error('Newsletter subscription error:', error);
    res.status(500).json({ error: 'Failed to subscribe to newsletter' });
  }
});

/**
 * Unsubscribe from newsletter
 * POST /api/newsletter/unsubscribe
 * Public endpoint (uses unsubscribe token)
 */
router.post('/unsubscribe', async (req, res) => {
  try {
    const { token, email } = req.body;

    if (!token && !email) {
      return res.status(400).json({ error: 'Token or email is required' });
    }

    let subscription;

    if (token) {
      subscription = await prisma.newsletterSubscription.findUnique({
        where: { unsubscribeToken: token },
      });
    } else {
      subscription = await prisma.newsletterSubscription.findUnique({
        where: { email },
      });
    }

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    if (!subscription.isActive) {
      return res.status(400).json({ error: 'Already unsubscribed' });
    }

    // Unsubscribe
    await prisma.newsletterSubscription.update({
      where: { id: subscription.id },
      data: {
        isActive: false,
        unsubscribedAt: new Date(),
      },
    });

    res.json({ message: 'Successfully unsubscribed from newsletter' });
  } catch (error) {
    console.error('Newsletter unsubscribe error:', error);
    res.status(500).json({ error: 'Failed to unsubscribe from newsletter' });
  }
});

/**
 * Get all newsletter subscribers (Admin only)
 * GET /api/newsletter/subscribers
 */
router.get('/subscribers', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { isActive, limit = 100, offset = 0 } = req.query;

    const where = {};
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const [subscribers, total] = await Promise.all([
      prisma.newsletterSubscription.findMany({
        where,
        orderBy: { subscribedAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset),
        select: {
          id: true,
          email: true,
          name: true,
          isActive: true,
          subscribedAt: true,
          unsubscribedAt: true,
          source: true,
        },
      }),
      prisma.newsletterSubscription.count({ where }),
    ]);

    res.json({
      subscribers,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: total > parseInt(offset) + parseInt(limit),
      },
    });
  } catch (error) {
    console.error('Get subscribers error:', error);
    res.status(500).json({ error: 'Failed to get subscribers' });
  }
});

/**
 * Get subscriber count (Admin only)
 * GET /api/newsletter/count
 */
router.get('/count', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const [active, inactive, total] = await Promise.all([
      prisma.newsletterSubscription.count({ where: { isActive: true } }),
      prisma.newsletterSubscription.count({ where: { isActive: false } }),
      prisma.newsletterSubscription.count(),
    ]);

    res.json({
      active,
      inactive,
      total,
    });
  } catch (error) {
    console.error('Get subscriber count error:', error);
    res.status(500).json({ error: 'Failed to get subscriber count' });
  }
});

module.exports = router;
