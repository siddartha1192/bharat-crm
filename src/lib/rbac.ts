/**
 * Role-Based Access Control (RBAC) System
 * Production-ready, scalable permission management
 */

export type UserRole = 'ADMIN' | 'MANAGER' | 'AGENT' | 'VIEWER';

export type Permission =
  // User Management
  | 'users:create'
  | 'users:read'
  | 'users:update'
  | 'users:delete'
  | 'users:manage_roles'
  // Lead Management
  | 'leads:create'
  | 'leads:read'
  | 'leads:update'
  | 'leads:delete'
  | 'leads:assign'
  | 'leads:export'
  // Contact Management
  | 'contacts:create'
  | 'contacts:read'
  | 'contacts:update'
  | 'contacts:delete'
  | 'contacts:export'
  // Deal Management
  | 'deals:create'
  | 'deals:read'
  | 'deals:update'
  | 'deals:delete'
  | 'deals:assign'
  // Task Management
  | 'tasks:create'
  | 'tasks:read'
  | 'tasks:update'
  | 'tasks:delete'
  | 'tasks:assign'
  // Calendar
  | 'calendar:create'
  | 'calendar:read'
  | 'calendar:update'
  | 'calendar:delete'
  // Invoice Management
  | 'invoices:create'
  | 'invoices:read'
  | 'invoices:update'
  | 'invoices:delete'
  | 'invoices:send'
  // WhatsApp
  | 'whatsapp:read'
  | 'whatsapp:send'
  | 'whatsapp:ai_toggle'
  // AI Assistant
  | 'ai:use_portal'
  | 'ai:ingest_documents'
  // Analytics & Reports
  | 'analytics:view'
  | 'reports:generate'
  | 'reports:export'
  // Settings
  | 'settings:view'
  | 'settings:update'
  | 'integrations:manage';

/**
 * Role Permission Matrix
 * Define what each role can do
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: [
    // Full access to everything
    'users:create',
    'users:read',
    'users:update',
    'users:delete',
    'users:manage_roles',
    'leads:create',
    'leads:read',
    'leads:update',
    'leads:delete',
    'leads:assign',
    'leads:export',
    'contacts:create',
    'contacts:read',
    'contacts:update',
    'contacts:delete',
    'contacts:export',
    'deals:create',
    'deals:read',
    'deals:update',
    'deals:delete',
    'deals:assign',
    'tasks:create',
    'tasks:read',
    'tasks:update',
    'tasks:delete',
    'tasks:assign',
    'calendar:create',
    'calendar:read',
    'calendar:update',
    'calendar:delete',
    'invoices:create',
    'invoices:read',
    'invoices:update',
    'invoices:delete',
    'invoices:send',
    'whatsapp:read',
    'whatsapp:send',
    'whatsapp:ai_toggle',
    'ai:use_portal',
    'ai:ingest_documents',
    'analytics:view',
    'reports:generate',
    'reports:export',
    'settings:view',
    'settings:update',
    'integrations:manage',
  ],

  MANAGER: [
    // Can manage most things but not users/roles
    'users:read',
    'leads:create',
    'leads:read',
    'leads:update',
    'leads:delete',
    'leads:assign',
    'leads:export',
    'contacts:create',
    'contacts:read',
    'contacts:update',
    'contacts:delete',
    'contacts:export',
    'deals:create',
    'deals:read',
    'deals:update',
    'deals:delete',
    'deals:assign',
    'tasks:create',
    'tasks:read',
    'tasks:update',
    'tasks:delete',
    'tasks:assign',
    'calendar:create',
    'calendar:read',
    'calendar:update',
    'calendar:delete',
    'invoices:create',
    'invoices:read',
    'invoices:update',
    'invoices:delete',
    'invoices:send',
    'whatsapp:read',
    'whatsapp:send',
    'whatsapp:ai_toggle',
    'ai:use_portal',
    'analytics:view',
    'reports:generate',
    'reports:export',
    'settings:view',
  ],

  AGENT: [
    // Can work with assigned items
    'leads:create',
    'leads:read',
    'leads:update', // Only own leads
    'contacts:create',
    'contacts:read',
    'contacts:update', // Only own contacts
    'deals:create',
    'deals:read',
    'deals:update', // Only own deals
    'tasks:create',
    'tasks:read',
    'tasks:update', // Only own tasks
    'calendar:create',
    'calendar:read',
    'calendar:update',
    'calendar:delete',
    'invoices:read',
    'invoices:create',
    'whatsapp:read',
    'whatsapp:send',
    'ai:use_portal',
  ],

  VIEWER: [
    // Read-only access
    'leads:read',
    'contacts:read',
    'deals:read',
    'tasks:read',
    'calendar:read',
    'invoices:read',
    'whatsapp:read',
    'analytics:view',
  ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some((permission) => hasPermission(role, permission));
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every((permission) => hasPermission(role, permission));
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

/**
 * Role hierarchy (for future expansion)
 * Higher roles inherit permissions from lower roles
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  VIEWER: 1,
  AGENT: 2,
  MANAGER: 3,
  ADMIN: 4,
};

/**
 * Check if role1 has higher or equal authority than role2
 */
export function hasHigherRole(role1: UserRole, role2: UserRole): boolean {
  return ROLE_HIERARCHY[role1] >= ROLE_HIERARCHY[role2];
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: UserRole): string {
  const displayNames: Record<UserRole, string> = {
    ADMIN: 'Administrator',
    MANAGER: 'Manager',
    AGENT: 'Sales Agent',
    VIEWER: 'Viewer',
  };
  return displayNames[role] ?? role;
}

/**
 * Get role description
 */
export function getRoleDescription(role: UserRole): string {
  const descriptions: Record<UserRole, string> = {
    ADMIN: 'Full system access including user management, settings, and all features',
    MANAGER: 'Manage team operations, leads, deals, and generate reports',
    AGENT: 'Create and manage own leads, contacts, deals, and tasks',
    VIEWER: 'Read-only access to view data and reports',
  };
  return descriptions[role] ?? '';
}
