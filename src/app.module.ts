import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AcceptLanguageResolver, I18nModule, QueryResolver } from 'nestjs-i18n';
import { AuthModule } from './auth/auth.module';
import * as path from 'path';
import { ConfigModule } from '@nestjs/config';
import { ForgotPasswordModule } from './modules/auth/forgot_password/forgot_password.module';
import { ResetPasswordModule } from './modules/auth/reset_password/reset_password.module';
import { LoginModule } from './modules/auth/login/login.module';
import { RegisterModule } from './modules/auth/register/register.module';
import { PersonalAccessTokensModule } from './modules/auth/personal_access_tokens/personal_access_tokens.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { PugAdapter } from '@nestjs-modules/mailer/dist/adapters/pug.adapter';
import { SocialLoginModule } from './modules/auth/social_login/social_login.module';
import { UpdateLocaleModule } from './modules/update_locale/update_locale.module';
import { UpdatePasswordModule } from './modules/update_password/update_password.module';
import { SendOtpModule } from './modules/send_otp/send_otp.module';
import { VerifyOtpModule } from './modules/verify_otp/verify_otp.module';
import { SettingModule } from './modules/setting/setting.module';
import { ContentPageModule } from './modules/content_page/content_page.module';
import { UserProfileModule } from './modules/user-profile/user-profile.module';
import { RouterModule } from '@nestjs/core';
import { SubAdminModule } from './modules/admin/sub-admins/sub-admins.module';
import { PermissionModule } from './modules/admin/permissions/permissions.module';
import { RolesModule } from './modules/admin/roles/roles.module';
import { AdminAuthModule } from './modules/admin/admin-auth/admin-auth.module';
import { CountriesModule } from './modules/admin/countries/countries.module';
import { CitiesModule } from './modules/admin/cities/cities.module';
import { StatesModule } from './modules/admin/states/states.module';
import { UsersModule } from './modules/admin/users/users.module';
import { ContentPagesModule } from './modules/admin/content-pages/content-pages.module';
import { AppSettingsModule } from './modules/admin/app-settings/app-settings.module';
import { ProfilesModule } from './modules/admin/profiles/profiles.module';
import { HotelsModule } from './modules/admin/hotels/hotels.module';
import { AmenitiesModule } from './modules/admin/amenities/amenities.module';
import { RoomTypesModule } from './modules/admin/room-types/room-types.module';
import { UploadsModule } from './modules/admin/uploads/uploads.module';
import { AppConfigModule } from './modules/admin/config/config.module';
import { WeddingGroupsModule } from './modules/admin/wedding-groups/wedding-groups.module';
import { RoomBlocksModule } from './modules/admin/room-blocks/room-blocks.module';
import { GroupAddonsModule } from './modules/admin/group-addons/group-addons.module';
import { GroupItineraryModule } from './modules/admin/group-itinerary/group-itinerary.module';
import { CancellationPoliciesModule } from './modules/admin/cancellation-policies/cancellation-policies.module';
import { CurrenciesModule } from './modules/admin/currencies/currencies.module';
import { BookingsModule } from './modules/admin/bookings/bookings.module';
import { ReportsModule } from './modules/admin/reports/reports.module';
import { GuestsModule } from './modules/admin/guests/guests.module';
import { PaymentsModule } from './modules/admin/payments/payments.module';
import { InvoicesModule } from './modules/admin/invoices/invoices.module';
import { PublicInvoicesModule } from './modules/public/invoices/public-invoices.module';
import { PublicWeddingsModule } from './modules/public/weddings/public-weddings.module';
import { PublicPaymentsModule } from './modules/public/payments/public-payments.module';
import { PublicConfigModule } from './modules/public/config/public-config.module';
import { BookingWizardModule } from './modules/public/booking-wizard/booking-wizard.module';
import { GuestAuthModule } from './modules/public/guest-auth/guest-auth.module';
import { GuestBookingsModule } from './modules/public/guest-bookings/guest-bookings.module';
import { GuestFlightsModule } from './modules/public/guest-flights/guest-flights.module';
import { AdminGuestFlightsModule } from './modules/admin/guest-flights/admin-guest-flights.module';
import { ScheduledTasksModule } from './modules/scheduled-tasks/scheduled-tasks.module';
import { getEnvironmentData } from './helpers/general';
import { DatabaseModule } from './core/database/database.module';
import { LoggingModule } from './core/logging';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

// N8N Integration Modules
import { EventsModule } from './modules/events/events.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { AdminWebhooksModule } from './modules/admin/webhooks/webhooks.module';
import { ApiKeysModule } from './modules/admin/api-keys/api-keys.module';
import { ActivityLogsModule } from './modules/admin/activity-logs/activity-logs.module';
import { ExternalApiModule } from './modules/external-api/external-api.module';
import { SystemSettingsModule } from './modules/admin/system-settings/system-settings.module';
import { SupportTicketsModule } from './modules/admin/support-tickets/support-tickets.module';
import { PublicSupportTicketsModule } from './modules/public/support-tickets/public-support-tickets.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      expandVariables: true,
    }),
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      loaderOptions: {
        path: path.join(__dirname, '/i18n/'),
        watch: true,
      },
      resolvers: [
        { use: QueryResolver, options: ['lang'] },
        AcceptLanguageResolver,
      ],
    }),
    MailerModule.forRoot({
      transport: {
        host: getEnvironmentData('MAIL_HOST'),
        port: getEnvironmentData('MAIL_PORT'),
        ignoreTLS: getEnvironmentData('MAIL_ENCRYPTION') !== 'tls',
        secure: Number(getEnvironmentData('MAIL_PORT')) === 465,
        auth: {
          user: getEnvironmentData('MAIL_USERNAME'),
          pass: getEnvironmentData('MAIL_PASSWORD'),
        },
      },
      defaults: {
        from: `"${getEnvironmentData('MAIL_FROM_NAME')}" <${getEnvironmentData(
          'MAIL_FROM_ADDRESS',
        )}>`,
      },
      template: {
        dir: __dirname + '/views/emails',
        adapter: new PugAdapter(),
        options: {
          strict: true,
        },
      },
    }),
    AuthModule,
    // Global Logging Module (Winston) - must be after AuthModule for JWT guard
    LoggingModule,
    PersonalAccessTokensModule,
    ForgotPasswordModule,
    ResetPasswordModule,
    LoginModule,
    RegisterModule,
    SocialLoginModule,
    UpdateLocaleModule,
    UpdatePasswordModule,
    SendOtpModule,
    VerifyOtpModule,
    SettingModule,
    ContentPageModule,
    UserProfileModule,
    DatabaseModule,
    RouterModule.register([
      {
        path: '/',
        children: [
          {
            path: '/',
            module: ForgotPasswordModule,
          },
          {
            path: '/',
            module: ResetPasswordModule,
          },
          {
            path: '/',
            module: LoginModule,
          },
          {
            path: '/',
            module: RegisterModule,
          },
          {
            path: '/',
            module: SocialLoginModule,
          },
          {
            path: '/',
            module: UpdateLocaleModule,
          },
          {
            path: '/',
            module: UpdatePasswordModule,
          },
          {
            path: '/',
            module: SendOtpModule,
          },
          {
            path: '/',
            module: VerifyOtpModule,
          },
          {
            path: '/',
            module: SettingModule,
          },
          {
            path: '/',
            module: ContentPageModule,
          },
          {
            path: '/',
            module: UserProfileModule,
          },
        ],
      },
    ]),
    SubAdminModule,
    PermissionModule,
    RolesModule,
    AdminAuthModule,
    CountriesModule,
    CitiesModule,
    StatesModule,
    UsersModule,
    ContentPagesModule,
    AppSettingsModule,
    ProfilesModule,
    HotelsModule,
    AmenitiesModule,
    RoomTypesModule,
    UploadsModule,
    AppConfigModule,
    WeddingGroupsModule,
    RoomBlocksModule,
    GroupAddonsModule,
    GroupItineraryModule,
    CancellationPoliciesModule,
    CurrenciesModule,
    BookingsModule,
    GuestsModule,
    PaymentsModule,
    InvoicesModule,
    ReportsModule,
    PublicInvoicesModule,
    PublicWeddingsModule,
    PublicPaymentsModule,
    PublicConfigModule,
    BookingWizardModule,
    GuestAuthModule,
    GuestBookingsModule,
    GuestFlightsModule,
    AdminGuestFlightsModule,
    ScheduledTasksModule,
    // N8N Integration
    EventsModule,
    WebhooksModule,
    AdminWebhooksModule,
    ApiKeysModule,
    ActivityLogsModule,
    ExternalApiModule,
    // System Configuration (must be early for settings cache)
    SystemSettingsModule,
    // Support Tickets
    SupportTicketsModule,
    PublicSupportTicketsModule,
    // Serve uploaded files from /uploads
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
      serveStaticOptions: {
        index: false,
        fallthrough: false,  // Return 404 if file not found instead of passing to next handler
      },
    }),
    // Serve logs viewer at /logs-viewer (separate from admin panel)
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'public', 'logs-viewer'),
      serveRoot: '/logs-viewer',
      serveStaticOptions: {
        index: ['index.html'],
      },
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
