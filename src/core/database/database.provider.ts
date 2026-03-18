// Explicit require so Vercel's bundler includes pg
import 'pg';
import { Sequelize } from 'sequelize-typescript';
import { getEnvironmentData } from 'src/helpers/general';
import { DatabaseConfig } from './database.config';
import {
  AdminPasswordResets,
  Admins,
  AppVersionLogs,
  Cities,
  ContentPages,
  Countries,
  Currencies,
  ModelHasPermissions,
  ModelHasRoles,
  PasswordResets,
  Permissions,
  PersonalAccessTokens,
  RoleHasPermissions,
  Roles,
  Settings,
  SocialLogins,
  States,
  Users,
  // Wedding Group Booking Models
  Hotels,
  RoomTypes,
  Amenities,
  HotelAmenities,
  WeddingGroups,
  GroupRoomBlocks,
  GroupAddons,
  CancellationPolicies,
  Guests,
  Bookings,
  BookingRooms,
  BookingAddons,
  Payments,
  Invoices,
  Refunds,
  Notifications,
  GroupItinerary,
  GuestFlights,
  PaymentReminderLogs,
  BookingHolds,
  // N8N Integration Models
  Webhooks,
  WebhookDeliveryLogs,
  ApiKeys,
  // System Configuration
  SystemSettings,
  // Activity Logging
  ActivityLogs,
  // Support Tickets
  SupportTickets,
  TicketMessages,
} from 'src/models';
import { PRODUCTION, SEQUELIZE, TEST } from 'src/config/constants';

export const databaseProviders = [
  {
    provide: SEQUELIZE,
    useFactory: async () => {
      let config;
      if (getEnvironmentData('NODE_ENV') === TEST) {
        config = DatabaseConfig.test;
      } else if (getEnvironmentData('NODE_ENV') === PRODUCTION) {
        config = DatabaseConfig.production;
      } else {
        config = DatabaseConfig.development;
      }

      const sequelize = new Sequelize({
        dialect: 'postgres',
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
        database: config.database,
        logging: false,
      });
      sequelize.addModels([
        AdminPasswordResets,
        Admins,
        AppVersionLogs,
        Cities,
        ContentPages,
        Countries,
        Currencies,
        ModelHasPermissions,
        ModelHasRoles,
        PasswordResets,
        Permissions,
        PersonalAccessTokens,
        RoleHasPermissions,
        Roles,
        Settings,
        SocialLogins,
        States,
        Users,
        // Wedding Group Booking Models
        Hotels,
        RoomTypes,
        Amenities,
        HotelAmenities,
        WeddingGroups,
        GroupRoomBlocks,
        GroupAddons,
        CancellationPolicies,
        Guests,
        Bookings,
        BookingRooms,
        BookingAddons,
        Payments,
        Invoices,
        Refunds,
        Notifications,
        GroupItinerary,
        GuestFlights,
        PaymentReminderLogs,
        BookingHolds,
        // N8N Integration Models
        Webhooks,
        WebhookDeliveryLogs,
        ApiKeys,
        // System Configuration
        SystemSettings,
        // Activity Logging
        ActivityLogs,
        // Support Tickets
        SupportTickets,
        TicketMessages,
      ]);
      // await sequelize.sync();
      return sequelize;
    },
  },
];
