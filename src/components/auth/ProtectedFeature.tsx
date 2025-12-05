/**
 * Protected Feature Component
 * Conditionally render UI elements based on permissions
 */

import { ReactNode } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { Permission } from '@/lib/rbac';

interface ProtectedFeatureProps {
  permission: Permission | Permission[];
  children: ReactNode;
  fallback?: ReactNode;
  requireAll?: boolean; // If true, requires all permissions. If false, requires any permission.
}

/**
 * Render children only if user has the required permission(s)
 *
 * @example
 * <ProtectedFeature permission="leads:create">
 *   <Button>Create Lead</Button>
 * </ProtectedFeature>
 *
 * @example Multiple permissions (any)
 * <ProtectedFeature permission={['leads:create', 'leads:update']}>
 *   <Button>Manage Leads</Button>
 * </ProtectedFeature>
 *
 * @example Multiple permissions (all required)
 * <ProtectedFeature permission={['leads:create', 'leads:delete']} requireAll>
 *   <Button>Full Lead Management</Button>
 * </ProtectedFeature>
 */
export function ProtectedFeature({
  permission,
  children,
  fallback = null,
  requireAll = false,
}: ProtectedFeatureProps) {
  const { can, canAny, canAll } = usePermissions();

  // Single permission
  if (typeof permission === 'string') {
    return can(permission) ? <>{children}</> : <>{fallback}</>;
  }

  // Multiple permissions
  const hasPermission = requireAll ? canAll(permission) : canAny(permission);
  return hasPermission ? <>{children}</> : <>{fallback}</>;
}

/**
 * Show different content for different roles
 *
 * @example
 * <RoleSwitch>
 *   <RoleSwitch.Admin>
 *     <AdminDashboard />
 *   </RoleSwitch.Admin>
 *   <RoleSwitch.Manager>
 *     <ManagerDashboard />
 *   </RoleSwitch.Manager>
 *   <RoleSwitch.Agent>
 *     <AgentDashboard />
 *   </RoleSwitch.Agent>
 *   <RoleSwitch.Default>
 *     <ViewerDashboard />
 *   </RoleSwitch.Default>
 * </RoleSwitch>
 */
export function RoleSwitch({ children }: { children: ReactNode }) {
  const { isAdmin, isManager, isAgent } = usePermissions();

  const childArray = Array.isArray(children) ? children : [children];

  for (const child of childArray) {
    if (!child) continue;

    const role = child.type?.displayName;

    if (role === 'Admin' && isAdmin()) return child;
    if (role === 'Manager' && isManager()) return child;
    if (role === 'Agent' && isAgent()) return child;
    if (role === 'Default') return child;
  }

  return null;
}

// Sub-components for RoleSwitch
function Admin({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
Admin.displayName = 'Admin';

function Manager({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
Manager.displayName = 'Manager';

function Agent({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
Agent.displayName = 'Agent';

function Default({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
Default.displayName = 'Default';

RoleSwitch.Admin = Admin;
RoleSwitch.Manager = Manager;
RoleSwitch.Agent = Agent;
RoleSwitch.Default = Default;
