import { Inject, Injectable } from '@nestjs/common';
import { Seeder } from 'nestjs-seeder';
import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import { PERMISSIONS_REPOSITORY, ROLE_HAS_PERMISSIONS_REPOSITORY } from 'src/config/constants';
import { Permissions, RoleHasPermissions } from 'src/models';

@Injectable()
export class PermissionsSeeder implements Seeder {
  constructor(
    @Inject(PERMISSIONS_REPOSITORY)
    private permissionsRepository: typeof Permissions,
    @Inject(ROLE_HAS_PERMISSIONS_REPOSITORY)
    private roleHasPermissionsRepository: typeof RoleHasPermissions,
  ) {}

  seed = async (): Promise<any> => {
    const now = new Date();

    // Obsolete permissions to remove (cleanup)
    const obsoletePermissions = [
      'payments.view-all',
      'payments.view-assigned',
      'payments.record-manual',
    ];

    // Remove obsolete permissions from role_has_permissions first
    const obsoletePerms = await this.permissionsRepository.findAll({
      where: { name: { [Op.in]: obsoletePermissions } },
      attributes: ['id'],
    });

    if (obsoletePerms.length > 0) {
      const obsoleteIds = obsoletePerms.map(p => p.id);
      await this.roleHasPermissionsRepository.destroy({
        where: { permission_id: { [Op.in]: obsoleteIds } },
      });
      await this.permissionsRepository.destroy({
        where: { id: { [Op.in]: obsoleteIds } },
      });
      console.log(`Removed ${obsoletePerms.length} obsolete permissions`);
    }
    const permissionNames = [
      // Dashboard
      'dashboard.view',

      // Support Tickets
      'support-tickets.view',
      'support-tickets.create',
      'support-tickets.edit',
      'support-tickets.delete',
      'support-tickets.reply',
      'support-tickets.assign',

      // Activity Logs
      'activity-logs.view',
      'activity-logs.export',

      // Users Management
      'users.view',
      'users.create',
      'users.edit',
      'users.delete',
      'users.activate',

      // Roles Management
      'roles.view',
      'roles.create',
      'roles.edit',
      'roles.delete',

      // Permissions Management
      'permissions.view',
      'permissions.create',
      'permissions.edit',
      'permissions.delete',

      // Hotels Management
      'hotels.view',
      'hotels.create',
      'hotels.edit',
      'hotels.delete',
      'hotels.import',

      // Room Types Management
      'room-types.view',
      'room-types.create',
      'room-types.edit',
      'room-types.delete',

      // Wedding Groups Management
      'wedding-groups.view',
      'wedding-groups.view-all', // Super Admin only
      'wedding-groups.view-assigned', // Group Manager
      'wedding-groups.create',
      'wedding-groups.edit',
      'wedding-groups.delete',
      'wedding-groups.activate',
      'wedding-groups.publish',
      'wedding-groups.pause',
      'wedding-groups.close',
      'wedding-groups.cancel',
      'wedding-groups.copy-link',
      'wedding-groups.import',
      'wedding-groups.export',

      // Room Blocks Management
      'room-blocks.view',
      'room-blocks.create',
      'room-blocks.edit',
      'room-blocks.delete',

      // Group Addons Management
      'group-addons.view',
      'group-addons.create',
      'group-addons.edit',
      'group-addons.delete',

      // Cancellation Policies
      'cancellation-policies.view',
      'cancellation-policies.create',
      'cancellation-policies.edit',
      'cancellation-policies.delete',

      // Guests Management
      'guests.view',
      'guests.create',
      'guests.edit',
      'guests.delete',
      'guests.import',
      'guests.export',
      'guests.send-invitation',

      // Bookings Management
      'bookings.view',
      'bookings.view-all', // Super Admin & Accounting
      'bookings.view-assigned', // Group Manager
      'bookings.create',
      'bookings.edit',
      'bookings.delete',
      'bookings.cancel',
      'bookings.confirm',
      'bookings.export',
      'bookings.record-payment', // Record Payment button on Bookings page
      'bookings.refund', // Refund button on Bookings page

      // Flights & Transfers Management
      'flights.view',
      'flights.edit',
      'flights.export',

      // Payments Management
      'payments.view',
      'payments.create',
      'payments.export',

      // Invoices Management
      'invoices.view',
      'invoices.create',
      'invoices.send',
      'invoices.download',
      'invoices.mark-paid',

      // Refunds Management
      'refunds.view',
      'refunds.create',
      'refunds.approve', // Group Manager & Super Admin
      'refunds.deny', // Group Manager & Super Admin
      'refunds.process',
      'refunds.export',

      // Reports & Analytics
      'reports.view',
      'reports.view-all', // Super Admin & Accounting
      'reports.export',
      'reports.financial', // Accounting

      // Settings
      'settings.view',
      'settings.edit',

      // Integrations
      'integrations.view',
      'integrations.manage',
      'integrations.configure',

      // Webhooks
      'webhooks.view',
      'webhooks.create',
      'webhooks.edit',
      'webhooks.delete',

      // API Keys
      'api-keys.view',
      'api-keys.create',
      'api-keys.delete',

      // Activity Logs
      'activity-logs.view',

      // Amenities
      'amenities.view',
      'amenities.create',
      'amenities.edit',
      'amenities.delete',

      // Notifications
      'notifications.view',
      'notifications.manage',

      // Content Pages
      'content-pages.view',
      'content-pages.create',
      'content-pages.edit',
      'content-pages.delete',

      // Itinerary/Events
      'itinerary.view',
      'itinerary.create',
      'itinerary.edit',
      'itinerary.delete',

      // Destination Guide
      'destination-guide.view',
      'destination-guide.create',
      'destination-guide.edit',
      'destination-guide.delete',

      // Google Sheets Integration
      'google-sheets.view',
      'google-sheets.export',
      'google-sheets.configure',
    ];

    const permissions = permissionNames.map((name) => ({
      uuid: uuidv4(),
      name,
      created_at: now,
    }));

    return this.permissionsRepository.bulkCreate(permissions, {
      ignoreDuplicates: true,
    });
  };

  drop = async (): Promise<any> => {
    return this.permissionsRepository.destroy({ where: {} });
  };
}
