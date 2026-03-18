import { seeder } from 'nestjs-seeder';
import { UsersSeeder } from './db/seeders/users.seeder';
import { ConfigModule } from '@nestjs/config';
import { SettingsSeeder } from './db/seeders/settings.seeder';
import { ContentPagesSeeder } from './db/seeders/content_pages.seeder';
import { CountriesSeeder } from './db/seeders/countries.seeder';
import { CurrenciesSeeder } from './db/seeders/currencies.seeder';
import { DatabaseModule } from './core/database/database.module';
import { settingsProviders } from './modules/admin/app-settings/app-settings.provider';
import { contentPagesProviders } from './modules/admin/content-pages/content-pages.provider';
import { countriesProviders } from './modules/admin/countries/countries.provider';
import { statesProviders } from './modules/admin/states/states.provider';
import { citiesProviders } from './modules/admin/cities/cities.provider';
import { currenciesProviders } from './modules/admin/currencies/currencies.provider';
import { AdminSeeder } from './db/seeders/admin.seeder';
import { adminsProviders } from './modules/admin/sub-admins/sub-admins.provider';
import { usersProviders } from './modules/admin/users/users.provider';
import { PermissionsSeeder } from './db/seeders/permissions.seeder';
import { RolesSeeder } from './db/seeders/roles.seeder';
import { RolePermissionsSeeder } from './db/seeders/role-permissions.seeder';
import { permissionsProviders } from './modules/admin/permissions/permissions.provider';
import { rolesProvider } from './modules/admin/roles/roles.provider';

seeder({
  imports: [
    ConfigModule.forRoot({
      expandVariables: true,
    }),
    DatabaseModule,
  ],
  providers: [
    ...settingsProviders,
    ...contentPagesProviders,
    ...countriesProviders,
    ...statesProviders,
    ...citiesProviders,
    ...currenciesProviders,
    ...adminsProviders,
    ...usersProviders,
    ...permissionsProviders,
    ...rolesProvider,
  ],
  // }).run([UsersSeeder, SettingsSeeder, AdminSeeder,ContentPagesSeeder, CountriesSeeder]);
}).run([CurrenciesSeeder, PermissionsSeeder, RolesSeeder, RolePermissionsSeeder, AdminSeeder, SettingsSeeder]);
