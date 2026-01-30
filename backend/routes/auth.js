const express = require('express');
const router = express.Router();
const authService = require('../services/auth');
const { authenticate, authorize } = require('../middleware/auth');

const prisma = require('../lib/prisma');

/**
 * Register new user with email/password (invitation-based only)
 * POST /api/auth/register
 * Requires a valid invitation token
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, company, role, invitationToken } = req.body;

    // Validate input
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    if (!invitationToken) {
      return res.status(400).json({
        error: 'Invitation token is required. Please use the invitation link sent to your email.',
        code: 'INVITATION_REQUIRED'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Register user (now requires valid invitation)
    const user = await authService.register({ email, password, name, company, role, invitationToken });

    // Create session
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const { token, refreshToken } = await authService.createSession(user.id, ipAddress, userAgent);

    // Fetch full tenant details to include plan information
    const fullTenant = await prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        status: true,
        subscriptionStart: true,
        subscriptionEnd: true,
        settings: true,
      },
    });

    res.status(201).json({
      user: {
        ...user,
        tenant: fullTenant,  // Include full tenant object with plan
      },
      token,
      refreshToken,
      message: 'Registration successful',
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(400).json({ error: error.message || 'Failed to register user' });
  }
});

/**
 * Login with email/password
 * POST /api/auth/login
 * Body: { email, password, tenantId? }
 * If user exists in multiple tenants, returns { requiresTenantSelection: true, tenants: [...] }
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password, tenantId } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await authService.login(email, password, ipAddress, userAgent, tenantId);

    res.json(result);
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ error: error.message || 'Failed to login' });
  }
});

/**
 * Google OAuth - Get authorization URL
 * GET /api/auth/google/url
 */
router.get('/google/url', (req, res) => {
  try {
    const authUrl = authService.getGoogleAuthUrl();
    res.json({ authUrl });
  } catch (error) {
    console.error('Google auth URL error:', error);
    res.status(500).json({ error: 'Failed to generate Google auth URL' });
  }
});

/**
 * Update current user's Google OAuth tokens (for re-authentication)
 * POST /api/auth/google/reauth
 * Requires authentication
 */
router.post('/google/reauth', authenticate, async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user.id;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    console.log('🔄 Re-authenticating user with Google:', userId);

    // Get tokens from code
    const { OAuth2Client } = require('google-auth-library');
    const googleClient = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_AUTH_REDIRECT_URI || 'http://localhost:8080/auth/google/callback'
    );

    const { tokens } = await googleClient.getToken(code);
    googleClient.setCredentials(tokens);

    // Get user info
    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const googleEmail = payload.email;

    // Update user's Google tokens
    await prisma.user.update({
      where: { id: userId },
      data: {
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token || undefined, // Only update if new refresh token provided
        googleEmail: googleEmail,
      },
    });

    console.log('✅ Successfully updated Google tokens for user:', userId);

    res.json({
      message: 'Google authentication updated successfully',
      email: googleEmail
    });
  } catch (error) {
    console.error('Google re-auth error:', error);
    res.status(500).json({ error: 'Failed to update Google authentication' });
  }
});

/**
 * Google OAuth - Handle callback
 * POST /api/auth/google/callback
 * Body: { code?, pendingAuthId?, tenantId? }
 * If user exists in multiple tenants, returns { requiresTenantSelection: true, pendingAuthId, tenants: [...] }
 * For tenant selection: send { pendingAuthId, tenantId }
 */
router.post('/google/callback', async (req, res) => {
  try {
    const { code, pendingAuthId, tenantId } = req.body;

    if (!code && !pendingAuthId) {
      return res.status(400).json({ error: 'Authorization code or pending auth ID is required' });
    }

    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await authService.googleAuth(code, ipAddress, userAgent, pendingAuthId, tenantId);

    res.json(result);
  } catch (error) {
    console.error('Google callback error:', error);
    res.status(400).json({ error: error.message || 'Google authentication failed' });
  }
});

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    const result = await authService.refreshAccessToken(refreshToken);

    res.json(result);
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({ error: error.message || 'Failed to refresh token' });
  }
});

/**
 * Logout
 * POST /api/auth/logout
 */
router.post('/logout', authenticate, async (req, res) => {
  try {
    const token = req.headers.authorization.substring(7);
    await authService.logout(token);

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Failed to logout' });
  }
});

/**
 * Get current user
 * GET /api/auth/me
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        company: true,
        role: true,
        isActive: true,
        googleProfilePic: true,
        tenantId: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            plan: true,
            status: true,
            subscriptionStart: true,
            subscriptionEnd: true,
            settings: true,
          },
        },
        createdAt: true,
      },
    });

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

/**
 * Request password reset
 * POST /api/auth/forgot-password
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const result = await authService.requestPasswordReset(email);

    res.json(result);
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ error: 'Failed to request password reset' });
  }
});

/**
 * Reset password with token
 * POST /api/auth/reset-password
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({ error: 'Reset token and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const result = await authService.resetPassword(resetToken, newPassword);

    res.json(result);
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(400).json({ error: error.message || 'Failed to reset password' });
  }
});

/**
 * Get user sessions
 * GET /api/auth/sessions
 */
router.get('/sessions', authenticate, async (req, res) => {
  try {
    const sessions = await authService.getUserSessions(req.user.id);

    res.json({ sessions });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

/**
 * Revoke a session
 * DELETE /api/auth/sessions/:sessionId
 */
router.delete('/sessions/:sessionId', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const result = await authService.revokeSession(sessionId, req.user.id);

    res.json(result);
  } catch (error) {
    console.error('Revoke session error:', error);
    res.status(400).json({ error: error.message || 'Failed to revoke session' });
  }
});

/**
 * Get activity logs (Admin/Manager only)
 * GET /api/auth/activity-logs
 */
router.get('/activity-logs', authenticate, authorize('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { userId, action, entityType, limit = 50, offset = 0 } = req.query;

    const where = {};
    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (entityType) where.entityType = entityType;

    const logs = await prisma.activityLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    const total = await prisma.activityLog.count({ where });

    res.json({ logs, total });
  } catch (error) {
    console.error('Get activity logs error:', error);
    res.status(500).json({ error: 'Failed to get activity logs' });
  }
});

/**
 * Get my activity logs
 * GET /api/auth/my-activity
 */
router.get('/my-activity', authenticate, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const logs = await prisma.activityLog.findMany({
      where: {
        userId: req.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    const total = await prisma.activityLog.count({
      where: { userId: req.user.id },
    });

    res.json({ logs, total });
  } catch (error) {
    console.error('Get my activity error:', error);
    res.status(500).json({ error: 'Failed to get activity logs' });
  }
});

// Backwards compatibility with old auth routes
router.get('/user/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        company: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

module.exports = router;
