import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'required_permission';

/**
 * Decorator to specify required permission for an endpoint
 * Usage: @RequirePermission('module-name.action')
 *
 * Examples:
 * - @RequirePermission('wedding-groups.view')
 * - @RequirePermission('wedding-groups.create')
 * - @RequirePermission('wedding-groups.edit')
 * - @RequirePermission('wedding-groups.delete')
 */
export const RequirePermission = (permission: string) =>
  SetMetadata(PERMISSION_KEY, permission);
