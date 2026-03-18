/**
 * Data Ownership Helper
 *
 * Handles data-level filtering based on user roles:
 * - Super Admin & Developer: Can access ALL data
 * - Other roles: Can ONLY access data they created
 */

export interface AdminUser {
  id: number;
  uuid?: string;
  name?: string;
  email?: string;
  roles?: Array<{ id?: number; name: string; permissions?: any[] }>;
}

/**
 * Roles that have full access to all data
 */
const FULL_ACCESS_ROLES = ['Developer', 'Super Admin'];

/**
 * Check if the admin user has full data access (Super Admin or Developer)
 * @param admin - The authenticated admin user from request.user
 * @returns true if user can access all data, false if filtered access only
 */
export function hasFullDataAccess(admin: AdminUser): boolean {
  if (!admin || !admin.roles || admin.roles.length === 0) {
    return false;
  }

  const roleNames = admin.roles.map((role) =>
    typeof role === 'string' ? role : role.name
  );

  return roleNames.some((name) => FULL_ACCESS_ROLES.includes(name));
}

/**
 * Get the admin ID for data filtering
 * Returns null if the user has full access (no filtering needed)
 * Returns the admin ID if filtering is required
 *
 * @param admin - The authenticated admin user from request.user
 * @returns admin ID for filtering, or null for full access
 */
export function getDataFilterAdminId(admin: AdminUser): number | null {
  if (hasFullDataAccess(admin)) {
    return null; // No filtering needed
  }
  return admin.id;
}

/**
 * Determine if data filtering should be applied
 * @param admin - The authenticated admin user from request.user
 * @returns true if data should be filtered by admin ownership
 */
export function shouldFilterData(admin: AdminUser): boolean {
  return !hasFullDataAccess(admin);
}
