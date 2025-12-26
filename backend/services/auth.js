const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const emailService = require('./email');

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';
const REFRESH_TOKEN_EXPIRES_IN = '30d';

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_AUTH_REDIRECT_URI || 'http://localhost:8080/auth/google/callback'
);

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
   * Register new user with email/password (tenant-aware)
   * If tenantId is not provided, auto-creates a new tenant for the user
   */
  async register(data) {
    const { email, password, name, company, role = 'AGENT', tenantId } = data;

    let finalTenantId = tenantId;
    let finalRole = role;
    let finalCompany = company;

    // If no tenantId provided, auto-create a new tenant
    if (!tenantId) {
      // Check if user with this email already exists in any tenant
      const existingUser = await prisma.user.findFirst({
        where: { email }
      });

      if (existingUser) {
        throw new Error('User with this email already exists. Please login or use a different email.');
      }

      // Auto-create tenant for new signup
      const tenantSlug = `${email.split('@')[0]}-${crypto.randomBytes(3).toString('hex')}`;
      const newTenant = await prisma.tenant.create({
        data: {
          name: company || `${name}'s Organization`,
          slug: tenantSlug,
          contactEmail: email,
          status: 'TRIAL',
          plan: 'FREE',
          maxUsers: 5,
          subscriptionStart: new Date(),
          subscriptionEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
          settings: {
            branding: {
              primaryColor: '#3b82f6',
              logoUrl: null
            },
            features: {
              whatsapp: true,
              email: true,
              ai: true,
              calendar: true
            }
          }
        }
      });

      finalTenantId = newTenant.id;
      finalRole = 'ADMIN'; // First user is admin of their tenant
      finalCompany = newTenant.name;
    } else {
      // Verify tenant exists
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId }
      });

      if (!tenant) {
        throw new Error('Invalid tenant');
      }

      // Check if user exists in this tenant
      const existingUser = await prisma.user.findFirst({
        where: {
          email,
          tenantId
        },
      });

      if (existingUser) {
        throw new Error('User with this email already exists in this organization');
      }

      finalCompany = company || tenant.name;
    }

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

    // Log activity
    await this.logActivity(user.id, 'REGISTER', 'User', user.id, `User registered: ${email}`);

    return user;
  }

  /**
   * Login with email/password
   */
  async login(email, password, ipAddress, userAgent) {
    // Find user (use findFirst since email is no longer unique globally, only per tenant)
    const user = await prisma.user.findFirst({
      where: { email },
    });

    if (!user) {
      throw new Error('Invalid email or password');
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

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        company: user.company,
        role: user.role,
        tenantId: user.tenantId,
      },
      token,
      refreshToken,
    };
  }

  /**
   * Google OAuth - Get authorization URL
   */
  getGoogleAuthUrl() {
    return googleClient.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/gmail.send', // Send emails via Gmail
        'https://mail.google.com/', // Full Gmail access (for reading replies, etc.)
      ],
      prompt: 'consent',
    });
  }

  /**
   * Google OAuth - Handle callback and login/signup
   */
  async googleAuth(code, ipAddress, userAgent) {
    try {
      // Exchange code for tokens
      const { tokens } = await googleClient.getToken(code);
      googleClient.setCredentials(tokens);

      // Get user info
      const ticket = await googleClient.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      const googleId = payload.sub;
      const email = payload.email;
      const name = payload.name;
      const picture = payload.picture;

      // Check if user exists
      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { googleId },
            { email },
          ],
        },
      });

      if (user) {
        // Update Google info if needed
        if (!user.googleId) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              googleId,
              googleEmail: email,
              googleProfilePic: picture,
            },
          });
        }

        // Log activity
        await this.logActivity(user.id, 'LOGIN', 'User', user.id, 'User logged in with Google', { ipAddress });
      } else {
        // Create new user with auto-tenant creation
        // For Google OAuth, we auto-create a personal tenant for the user
        const tenantSlug = `${email.split('@')[0]}-${crypto.randomBytes(3).toString('hex')}`;

        user = await prisma.user.create({
          data: {
            email,
            name,
            googleId,
            googleEmail: email,
            googleProfilePic: picture,
            role: 'ADMIN', // First user in their tenant is admin
            isActive: true,
            tenant: {
              create: {
                name: `${name}'s Organization`,
                slug: tenantSlug,
                contactEmail: email,
                status: 'TRIAL',
                plan: 'FREE',
                maxUsers: 5,
                subscriptionStart: new Date(),
                subscriptionEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
                settings: {
                  branding: {
                    primaryColor: '#3b82f6',
                    logoUrl: picture
                  },
                  features: {
                    whatsapp: true,
                    email: true,
                    ai: true,
                    calendar: true
                  }
                }
              }
            }
          },
          include: {
            tenant: true
          }
        });

        // Log activity
        await this.logActivity(user.id, 'REGISTER', 'User', user.id, 'User registered with Google', { ipAddress });
      }

      if (!user.isActive) {
        throw new Error('Account is deactivated');
      }

      // Create session
      const { token, refreshToken } = await this.createSession(user.id, ipAddress, userAgent);

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          company: user.company,
          role: user.role,
          tenantId: user.tenantId,
          profilePic: user.googleProfilePic,
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

    // Generate new tokens
    const newToken = this.generateToken(session.userId, session.user.role);
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
      return { message: 'Password reset email sent successfully' };
    } catch (error) {
      console.error('Error sending password reset email:', error);
      // Still return the token for development/testing purposes
      return { resetToken, message: 'Password reset token generated (email sending failed)', error: error.message };
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
