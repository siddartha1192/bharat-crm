const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const emailService = require('./email');

// Use Prisma singleton
const prisma = require('../lib/prisma');
const { createClient } = require('redis');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';
const REFRESH_TOKEN_EXPIRES_IN = '30d';

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_AUTH_REDIRECT_URI || 'http://localhost:8080/auth/google/callback'
);

// =============================================================================
// OAUTH STATE STORAGE (Redis for stateless multi-server support)
// =============================================================================
// In production with Redis: Uses Redis with TTL for distributed state
// In development without Redis: Falls back to in-memory Map
// =============================================================================

let redisClient = null;
let redisConnected = false;
const pendingGoogleAuths = new Map(); // Fallback for development

// Initialize Redis connection (called lazily)
async function initRedis() {
  if (redisClient && redisConnected) return true;

  if (!process.env.REDIS_URL) {
    return false;
  }

  try {
    redisClient = createClient({ url: process.env.REDIS_URL });
    redisClient.on('error', (err) => {
      console.error('[Auth] Redis error:', err.message);
      redisConnected = false;
    });
    await redisClient.connect();
    redisConnected = true;
    console.log('[Auth] Redis connected for OAuth state storage');
    return true;
  } catch (error) {
    console.log('[Auth] Redis not available, using in-memory OAuth state');
    return false;
  }
}

// Store OAuth state (Redis with TTL or in-memory fallback)
async function storeOAuthState(authId, data) {
  const hasRedis = await initRedis();

  if (hasRedis && redisConnected) {
    const key = `oauth:state:${authId}`;
    await redisClient.set(key, JSON.stringify(data), { EX: 300 }); // 5 min TTL
  } else {
    // Fallback to in-memory
    pendingGoogleAuths.set(authId, data);
  }
}

// Get OAuth state (and delete after retrieval - one-time use)
async function getOAuthState(authId) {
  const hasRedis = await initRedis();

  if (hasRedis && redisConnected) {
    const key = `oauth:state:${authId}`;
    const data = await redisClient.get(key);
    if (data) {
      await redisClient.del(key); // One-time use
      return JSON.parse(data);
    }
    return null;
  } else {
    // Fallback to in-memory
    const data = pendingGoogleAuths.get(authId);
    if (data) {
      pendingGoogleAuths.delete(authId);
    }
    return data || null;
  }
}

// Clean up expired pending auths every 10 minutes (only for in-memory fallback)
setInterval(() => {
  if (!redisConnected) {
    const now = Date.now();
    for (const [key, value] of pendingGoogleAuths.entries()) {
      if (value.expiresAt < now) {
        pendingGoogleAuths.delete(key);
      }
    }
  }
}, 10 * 60 * 1000);

class AuthService {
  /**
   * Generate JWT token with tenant context
   */
  generateToken(userId, role, tenantId) {
    return jwt.sign(
      { userId, role, tenantId },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken() {
    return crypto.randomBytes(40).toString('hex');
  }

  /**
   * Verify JWT token
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Hash password
   */
  async hashPassword(password) {
    return await bcrypt.hash(password, 10);
  }

  /**
   * Compare password
   */
  async comparePassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  /**
   * Create session with tenant context
   */
  async createSession(userId, ipAddress, userAgent) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, tenantId: true }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const token = this.generateToken(userId, user.role, user.tenantId);
    const refreshToken = this.generateRefreshToken();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    const session = await prisma.session.create({
      data: {
        userId,
        token,
        refreshToken,
        expiresAt,
        ipAddress,
        userAgent,
        isActive: true,
      },
    });

    return { token, refreshToken, session };
  }

  /**
   * Register new user with email/password (invitation-based only)
   * SECURITY: Users can only register with a valid invitation token
   * Auto-tenant creation is disabled to prevent unauthorized access
   */
  async register(data) {
    const { email, password, name, company, role = 'AGENT', tenantId, invitationToken } = data;

    // SECURITY: Registration now requires a valid invitation token
    if (!invitationToken) {
      throw new Error('Registration requires a valid invitation. Please contact your administrator for access.');
    }

    // Verify invitation token
    const invitation = await prisma.tenantInvitation.findUnique({
      where: { token: invitationToken },
      include: { tenant: true }
    });

    if (!invitation) {
      throw new Error('Invalid invitation token.');
    }

    if (!invitation.isActive) {
      throw new Error('This invitation is no longer active.');
    }

    if (invitation.acceptedAt) {
      throw new Error('This invitation has already been used.');
    }

    if (new Date() > invitation.expiresAt) {
      throw new Error('This invitation has expired.');
    }

    if (invitation.email.toLowerCase() !== email.toLowerCase()) {
      throw new Error('Email does not match the invitation.');
    }

    // Check if user with this email already exists in this tenant
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        tenantId: invitation.tenantId
      }
    });

    if (existingUser) {
      throw new Error('User with this email already exists in this organization.');
    }

    const finalTenantId = invitation.tenantId;
    const finalRole = invitation.role || role;
    const finalCompany = invitation.tenant.name;

    // DISABLED: Auto-tenant creation is no longer allowed for security

    // Hash password
    const hashedPassword = await this.hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        company: finalCompany,
        role: finalRole,
        tenantId: finalTenantId,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        company: true,
        role: true,
        tenantId: true,
        createdAt: true,
      },
    });

    // Mark invitation as accepted
    await prisma.tenantInvitation.update({
      where: { id: invitation.id },
      data: {
        acceptedAt: new Date(),
        isActive: false
      }
    });

    // Log activity
    await this.logActivity(user.id, 'REGISTER', 'User', user.id, `User registered via invitation: ${email}`);

    return user;
  }

  /**
   * Login with email/password
   * Supports multi-tenant: if user exists in multiple tenants, returns list to choose from
   */
  async login(email, password, ipAddress, userAgent, tenantId = null) {
    // Find all users with this email across all tenants
    const users = await prisma.user.findMany({
      where: { email },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          }
        }
      }
    });

    if (!users || users.length === 0) {
      throw new Error('Invalid email or password');
    }

    // If tenantId is provided, find the specific user in that tenant
    let user;
    if (tenantId) {
      user = users.find(u => u.tenantId === tenantId);
      if (!user) {
        throw new Error('Invalid email or password');
      }
    } else if (users.length > 1) {
      // Multiple accounts with same email - user needs to select organization
      return {
        requiresTenantSelection: true,
        tenants: users.map(u => ({
          tenantId: u.tenant.id,
          tenantName: u.tenant.name,
          tenantSlug: u.tenant.slug,
          role: u.role,
        }))
      };
    } else {
      // Only one account with this email
      user = users[0];
    }

    if (!user.isActive) {
      throw new Error('Account is deactivated');
    }

    // Check password
    if (!user.password) {
      throw new Error('Please login with Google');
    }

    const isValidPassword = await this.comparePassword(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Create session
    const { token, refreshToken } = await this.createSession(user.id, ipAddress, userAgent);

    // Log activity
    await this.logActivity(user.id, 'LOGIN', 'User', user.id, 'User logged in', { ipAddress });

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

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        company: user.company,
        role: user.role,
        tenantId: user.tenantId,
        tenant: fullTenant,  // Return full tenant object with plan
      },
      token,
      refreshToken,
    };
  }

  /**
   * Google OAuth - Get authorization URL (LOGIN ONLY - minimal scopes)
   * Only requests profile and email for authentication purposes
   * Service-specific integrations (Gmail, Calendar) have separate OAuth flows
   */
  getGoogleAuthUrl() {
    return googleClient.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
      prompt: 'consent',
    });
  }

  /**
   * Google OAuth - Handle callback and login/signup
   * Supports multi-tenant: if user exists in multiple tenants, returns list to choose from
   */
  async googleAuth(code, ipAddress, userAgent, pendingAuthId = null, tenantId = null) {
    try {
      let googleId, email, name, picture, users;

      // If pendingAuthId is provided, retrieve stored auth data from Redis/memory
      if (pendingAuthId) {
        const pendingAuth = await getOAuthState(pendingAuthId);
        if (!pendingAuth || pendingAuth.expiresAt < Date.now()) {
          throw new Error('Authentication session expired. Please login again.');
        }

        // Retrieve stored data (getOAuthState already deletes it - one-time use)
        ({ googleId, email, name, picture, users } = pendingAuth);
      } else {
        // Exchange code for tokens (first time only)
        const { tokens } = await googleClient.getToken(code);
        googleClient.setCredentials(tokens);

        // Get user info
        const ticket = await googleClient.verifyIdToken({
          idToken: tokens.id_token,
          audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        googleId = payload.sub;
        email = payload.email;
        name = payload.name;
        picture = payload.picture;

        // Find all users with this googleId or email across all tenants
        users = await prisma.user.findMany({
          where: {
            OR: [
              { googleId },
              { email },
            ],
          },
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                slug: true,
              }
            }
          }
        });
      }

      let user;

      if (users.length > 0) {
        // If tenantId is provided, find the specific user in that tenant
        if (tenantId) {
          user = users.find(u => u.tenantId === tenantId);
          if (!user) {
            throw new Error('Account not found in the selected organization');
          }
        } else if (users.length > 1) {
          // Multiple accounts - store pending auth in Redis/memory and return tenant list
          const authId = crypto.randomBytes(32).toString('hex');
          await storeOAuthState(authId, {
            googleId,
            email,
            name,
            picture,
            users,
            ipAddress,
            userAgent,
            expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
          });

          return {
            requiresTenantSelection: true,
            pendingAuthId: authId,
            tenants: users.map(u => ({
              tenantId: u.tenant.id,
              tenantName: u.tenant.name,
              tenantSlug: u.tenant.slug,
              role: u.role,
            }))
          };
        } else {
          // Only one account
          user = users[0];
        }

        // Update Google info if needed (only if googleId not already taken by another user)
        if (!user.googleId) {
          // Check if any of the found users already has this googleId
          const googleIdAlreadyTaken = users.some(u => u.googleId === googleId);

          if (!googleIdAlreadyTaken) {
            // Safe to add googleId to this user
            user = await prisma.user.update({
              where: { id: user.id },
              data: {
                googleId,
                googleEmail: email,
                googleProfilePic: picture,
              },
              include: {
                tenant: true
              }
            });
          } else {
            // GoogleId is already taken by another account, just update the profile pic
            user = await prisma.user.update({
              where: { id: user.id },
              data: {
                googleEmail: email,
                googleProfilePic: picture,
              },
              include: {
                tenant: true
              }
            });
          }
        }

        // Log activity
        await this.logActivity(user.id, 'LOGIN', 'User', user.id, 'User logged in with Google', { ipAddress });
      } else {
        // SECURITY: Auto-creation of users/tenants is disabled
        // Users must be invited by their organization admin
        throw new Error('No account found for this email. Please contact your administrator to request an invitation.');

        /* DISABLED: Auto-tenant creation for security
        const tenantSlug = `${email.split('@')[0]}-${crypto.randomBytes(3).toString('hex')}`;
        user = await prisma.user.create({
          data: {
            email,
            name,
            googleId,
            googleEmail: email,
            googleProfilePic: picture,
            role: 'ADMIN',
            isActive: true,
            tenant: {
              create: {
                name: `${name}'s Organization`,
                slug: tenantSlug,
                contactEmail: email,
                status: 'TRIAL',
                plan: 'FREE',
                maxUsers: 2,
                subscriptionStart: new Date(),
                subscriptionEnd: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000), // 25 days trial
                settings: { ... }
              }
            }
          },
          include: { tenant: true }
        });
        */
      }

      if (!user.isActive) {
        throw new Error('Account is deactivated');
      }

      // Create session
      const { token, refreshToken } = await this.createSession(user.id, ipAddress, userAgent);

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

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          company: user.company,
          role: user.role,
          tenantId: user.tenantId,
          profilePic: user.googleProfilePic,
          tenant: fullTenant,  // Return full tenant object with plan
        },
        token,
        refreshToken,
      };
    } catch (error) {
      console.error('Google Auth Error:', error);
      throw new Error('Google authentication failed: ' + error.message);
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken) {
    const session = await prisma.session.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    if (!session || !session.isActive || new Date() > session.expiresAt) {
      throw new Error('Invalid or expired refresh token');
    }

    // Generate new tokens with tenant context
    const newToken = this.generateToken(session.userId, session.user.role, session.user.tenantId);
    const newRefreshToken = this.generateRefreshToken();

    // Update session
    await prisma.session.update({
      where: { id: session.id },
      data: {
        token: newToken,
        refreshToken: newRefreshToken,
      },
    });

    return { token: newToken, refreshToken: newRefreshToken };
  }

  /**
   * Logout
   */
  async logout(token) {
    try {
      const session = await prisma.session.findUnique({
        where: { token },
      });

      if (session) {
        await prisma.session.update({
          where: { id: session.id },
          data: { isActive: false },
        });

        // Log activity
        await this.logActivity(session.userId, 'LOGOUT', 'User', session.userId, 'User logged out');
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email) {
    const user = await prisma.user.findFirst({
      where: { email },
    });

    if (!user) {
      // Don't reveal if user exists
      return { message: 'If the email exists, a reset link has been sent' };
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour

    // Save token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: hashedToken,
        passwordResetExpires: expiresAt,
      },
    });

    // Log activity
    await this.logActivity(user.id, 'PASSWORD_RESET_REQUEST', 'User', user.id, 'Password reset requested');

    // Send password reset email
    try {
      await emailService.sendPasswordResetEmail(email, resetToken, user.id);
      return { message: 'Password reset email sent successfully. Please check your email.' };
    } catch (error) {
      console.error('Error sending password reset email:', error);

      // Check if error is related to email not being configured
      if (error.message && error.message.includes('Gmail not connected')) {
        return {
          message: 'Email is not configured in the tenant. Please contact your administrator to set up email integration in Settings > Integrations.',
          resetToken, // Return token for development/testing
          emailConfigured: false
        };
      }

      // For other errors
      return {
        resetToken,
        message: 'Failed to send password reset email. Please contact your administrator.',
        error: error.message
      };
    }
  }

  /**
   * Reset password
   */
  async resetPassword(resetToken, newPassword) {
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new Error('Invalid or expired reset token');
    }

    // Hash new password
    const hashedPassword = await this.hashPassword(newPassword);

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    // Invalidate all sessions
    await prisma.session.updateMany({
      where: { userId: user.id },
      data: { isActive: false },
    });

    // Log activity
    await this.logActivity(user.id, 'PASSWORD_RESET', 'User', user.id, 'Password reset successful');

    return { message: 'Password reset successful' };
  }

  /**
   * Log activity
   */
  async logActivity(userId, action, entityType, entityId, description, metadata = {}) {
    try {
      await prisma.activityLog.create({
        data: {
          userId,
          action,
          entityType,
          entityId,
          description,
          metadata,
        },
      });
    } catch (error) {
      console.error('Activity log error:', error);
    }
  }

  /**
   * Get user sessions
   */
  async getUserSessions(userId) {
    return await prisma.session.findMany({
      where: {
        userId,
        isActive: true,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Revoke session
   */
  async revokeSession(sessionId, userId) {
    const session = await prisma.session.findFirst({
      where: {
        id: sessionId,
        userId,
      },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    await prisma.session.update({
      where: { id: sessionId },
      data: { isActive: false },
    });

    await this.logActivity(userId, 'SESSION_REVOKED', 'Session', sessionId, 'Session revoked');

    return { message: 'Session revoked successfully' };
  }
}

module.exports = new AuthService();
