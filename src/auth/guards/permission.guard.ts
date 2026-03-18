import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';

/**
 * Guard that checks if the authenticated admin has the required permission.
 *
 * IMPORTANT:
 * - 'Developer' and 'Super Admin' roles automatically have ALL permissions
 * - Other roles must have the specific permission assigned
 *
 * Usage: Add to controller with @UseGuards(JwtAdminAuthGuard, PermissionGuard)
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get the required permission from the decorator
    const requiredPermission = this.reflector.getAllAndOverride<string>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no permission is required, allow access
    if (!requiredPermission) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const admin = request.user;

    if (!admin) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check if admin has roles loaded
    if (!admin.roles || admin.roles.length === 0) {
      throw new ForbiddenException('User has no roles assigned');
    }

    // Get role names
    const roleNames = admin.roles.map((role: any) =>
      typeof role === 'string' ? role : role.name
    );

    // BYPASS: Developer and Super Admin have ALL permissions
    if (roleNames.includes('Developer') || roleNames.includes('Super Admin')) {
      return true;
    }

    // Get all permissions from user's roles
    const userPermissions: string[] = [];
    for (const role of admin.roles) {
      if (role.permissions && Array.isArray(role.permissions)) {
        for (const permission of role.permissions) {
          const permName = typeof permission === 'string' ? permission : permission.name;
          if (permName && !userPermissions.includes(permName)) {
            userPermissions.push(permName);
          }
        }
      }
    }

    // Check if user has the required permission
    const hasPermission = userPermissions.includes(requiredPermission);

    if (!hasPermission) {
      throw new ForbiddenException(
        'You do not have permission to perform this action. Please contact your administrator.',
      );
    }

    return true;
  }
}
