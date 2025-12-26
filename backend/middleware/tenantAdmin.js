/**
 * Tenant Admin Authentication Middleware
 * Provides secure access to tenant management features
 */

const basicAuth = require('basic-auth');

/**
 * Tenant Admin Authentication
 * Uses HTTP Basic Auth with credentials from environment variables
 */
function tenantAdminAuth(req, res, next) {
  const credentials = basicAuth(req);

  // Get admin credentials from environment variables
  const ADMIN_USERNAME = process.env.TENANT_ADMIN_USERNAME || 'admin';
  const ADMIN_PASSWORD = process.env.TENANT_ADMIN_PASSWORD || 'admin123';

  // Check if credentials are provided and valid
  if (!credentials ||
      credentials.name !== ADMIN_USERNAME ||
      credentials.pass !== ADMIN_PASSWORD) {
    res.set('WWW-Authenticate', 'Basic realm="Tenant Administration"');
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Valid credentials required for tenant administration'
    });
  }

  // Credentials are valid, proceed
  next();
}

module.exports = {
  tenantAdminAuth
};
