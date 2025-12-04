/**
 * React Hook for Permission Checking
 * Use throughout the app to check user permissions
 */

import { useMemo } from 'react';
import {
  UserRole,
  Permission,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getRolePermissions,
} from '@/lib/rbac';

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  [key: string]: any;
}

/**
 * Hook to check permissions for the current user
 */
export function usePermissions() {
  // Get current user from localStorage
  const user: User | null = useMemo(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }, []);

  const role = user?.role ?? 'VIEWER';

  return {
    user,
    role,

    /**
     * Check if user has a specific permission
     * @example can('leads:create')
     */
    can: (permission: Permission): boolean => {
      return hasPermission(role, permission);
    },

    /**
     * Check if user has any of the specified permissions
     * @example canAny(['leads:create', 'leads:update'])
     */
    canAny: (permissions: Permission[]): boolean => {
      return hasAnyPermission(role, permissions);
    },

    /**
     * Check if user has all of the specified permissions
     * @example canAll(['leads:create', 'leads:update'])
     */
    canAll: (permissions: Permission[]): boolean => {
      return hasAllPermissions(role, permissions);
    },

    /**
     * Check if user does NOT have a permission
     * @example cannot('users:delete')
     */
    cannot: (permission: Permission): boolean => {
      return !hasPermission(role, permission);
    },

    /**
     * Get all permissions for the current user
     */
    getPermissions: (): Permission[] => {
      return getRolePermissions(role);
    },

    /**
     * Check if user is admin
     */
    isAdmin: (): boolean => {
      return role === 'ADMIN';
    },

    /**
     * Check if user is manager or above
     */
    isManager: (): boolean => {
      return role === 'ADMIN' || role === 'MANAGER';
    },

    /**
     * Check if user is agent or above
     */
    isAgent: (): boolean => {
      return role === 'ADMIN' || role === 'MANAGER' || role === 'AGENT';
    },

    /**
     * Check if user is viewer (lowest permission level)
     */
    isViewer: (): boolean => {
      return role === 'VIEWER';
    },
  };
}

/**
 * Hook to check if user owns a resource
 * Useful for agents who can only edit their own items
 */
export function useOwnership() {
  const { user } = usePermissions();

  return {
    /**
     * Check if current user owns the resource
     */
    owns: (resource: { userId?: string; assignedTo?: string }): boolean => {
      if (!user) return false;
      return (
        resource.userId === user.id ||
        resource.assignedTo === user.email ||
        resource.assignedTo === user.name
      );
    },

    /**
     * Check if user can modify the resource
     * Admins and Managers can modify anything
     * Agents can only modify their own
     */
    canModify: (
      resource: { userId?: string; assignedTo?: string },
      permission: Permission
    ): boolean => {
      const { can, isManager } = usePermissions();

      if (!can(permission)) return false;
      if (isManager()) return true;

      // Agents can only modify their own resources
      return owns(resource);
    },
  };
}
