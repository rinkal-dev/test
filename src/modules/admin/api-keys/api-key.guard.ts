import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiKeysService } from './api-keys.service';

export const REQUIRED_PERMISSION_KEY = 'required_permission';
export const RequirePermission = (permission: string) =>
  Reflect.metadata(REQUIRED_PERMISSION_KEY, permission);

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private apiKeysService: ApiKeysService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) {
      throw new UnauthorizedException('API key required. Include X-API-Key header.');
    }

    // Validate the API key
    const validKey = await this.apiKeysService.validateKey(apiKey);

    if (!validKey) {
      throw new UnauthorizedException('Invalid or expired API key');
    }

    // Check for required permission if specified
    const requiredPermission = this.reflector.get<string>(
      REQUIRED_PERMISSION_KEY,
      context.getHandler(),
    );

    if (requiredPermission) {
      const hasPermission = this.apiKeysService.hasPermission(
        validKey,
        requiredPermission,
      );

      if (!hasPermission) {
        throw new ForbiddenException(
          `API key does not have permission: ${requiredPermission}`,
        );
      }
    }

    // Update last used IP
    const ip = request.ip || request.connection?.remoteAddress;
    if (ip) {
      await this.apiKeysService.updateLastUsedIp(validKey.id, ip);
    }

    // Attach API key info to request for use in controllers
    request.apiKey = validKey;

    return true;
  }
}
