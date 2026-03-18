import { AdminLoginResponse } from './AdminLoginResponse';
import { CityListRes } from './CityListRes';
import { CountriesListRes } from './CountriesListRes';
import { PermissionDetailsRes } from './PermissionDetailsRes';
import { PermissionListRes } from './PermissionListRes';
import { RoleDetailsRes } from './RoleDetailsRes';
import { Message } from './schema/Message';
import { Success } from './schema/Success';
import { StateListRes } from './StateListRes';
import { SubAdminListRes } from './SubAdminListRes';
import { SubAdminDetailsRes } from './SubAdminDetailsRes';
import { UserDetailsRes } from './UserDetailsRes';
import { UserListRes } from './UserListRes';
import { ContentPageListRes } from './ContentPageListRes';
import { ContentPageDetailsRes } from './ContentPageDetailsRes';
import { AppVersionsRes } from './AppVersionsRes';
import { RolesListRes } from './RolesListRes';
import { AdminProfileRes } from './AdminProfileRes';

/**
 * Tags
 */
export const tags = {
  USER_AUTHENTICATION: 'User Authentication',
  ADMIN_AUTH: 'Admin Authentication',
  USER_PROFILE: 'User Profile',
  ADMIN_PROFILE: 'Admin Profile',
  USERS: 'Users',
  SETTINGS: 'Settings',
  ADMIN_SETTINGS: 'Admin Settings',
  PERMISSIONS: 'Permissions',
  CONTENT_PAGES: 'Content Pages',
  COUNTRIES: 'Countries',
  STATES: 'States',
  ROLES: 'Roles',
  SUB_ADMIN: 'Sub Admin',
  HOTELS: 'Hotels',
  UPLOADS: 'Uploads',
  WEDDING_GROUPS: 'Wedding Groups',
};

/**
 * Consumers
 */
export const consumers = {
  formURLEncoded: 'application/x-www-form-urlencoded',
};

/**
 * Exception Responses
 */
export const response = {
  ok: {
    description: 'Successful operation',
    type: Message,
  },

  success: {
    description: 'Successful operation.',
    type: Success,
  },

  permission_details: {
    description: 'Permission Details.',
    type: PermissionDetailsRes,
  },

  role_details: {
    description: 'Role Details.',
    type: RoleDetailsRes,
  },

  countries_list: {
    description: 'Country List.',
    type: CountriesListRes,
  },

  states_list: {
    description: 'State List.',
    type: StateListRes,
  },

  cities_list: {
    description: 'City List.',
    type: CityListRes,
  },

  permission_list: {
    description: 'Permission List.',
    type: PermissionListRes,
  },

  roles_list: {
    description: 'Permission List.',
    type: RolesListRes,
  },

  sub_admin_details: {
    description: 'Sub Admin Details.',
    type: SubAdminDetailsRes,
  },

  sub_admin_list: {
    description: 'Sub Admin List.',
    type: SubAdminListRes,
  },

  user_list: {
    description: 'User List.',
    type: UserListRes,
  },

  user_details: {
    description: 'User Details.',
    type: UserDetailsRes,
  },

  app_versions: {
    description: 'App Versions List.',
    type: AppVersionsRes,
  },

  content_page_list: {
    description: 'Content Page List.',
    type: ContentPageListRes,
  },

  content_page_details: {
    description: 'Content Page Details.',
    type: ContentPageDetailsRes,
  },

  admin_login: {
    description: 'Admin Login.',
    type: AdminLoginResponse,
  },

  admin_profile: {
    description: 'Admin Profile.',
    type: AdminProfileRes,
  },

  unauthorized: {
    description: 'Unauthorized.',
    type: Message,
  },

  badRequest: {
    description: 'Error occurred while performing some action.',
    type: Message,
  },

  unprocessable_entity: {
    description: 'Unprocessable Entity',
    type: Message,
  },

  forbidden: {
    description: 'Wrong password were sent in the request.',
    type: Message,
  },

  not_found: {
    description: 'Not Found.',
    type: Message,
  },

  internal_server_error: {
    description: 'Internal server error.',
    type: Message,
  },

  conflict: {
    description:
      'Request could not be processed because of conflict in the request.',
    type: Message,
  },

  validationException: {
    description: 'Validation failed.',
    type: Message,
  },

  serverException: {
    description: 'Error occurred while performing some action.',
    type: Message,
  },

  serverMaintenanceException: {
    description: 'Service unavailable',
    type: Message,
  },
};

/**
 * Headers
 */
export const headers = {
  accept: {
    name: 'Accept',
    description:
      'Type of response you are expecting from API. i.e. (application/json)',
    required: true,
    schema: {
      type: 'string',
      default: 'application/json',
    },
  },
  accept_language: {
    name: 'Accept-Language',
    description: 'ISO 2 Letter Language Code',
    required: true,
    schema: {
      type: 'string',
      enum: ['en', 'ar'],
    },
  },
  refresh_token: {
    name: 'Refresh-Token',
    description: 'Refresh Token',
    required: true,
    schema: {
      type: 'string',
    },
  },
};

export const queries = {
  permission_field: {
    name: 'field',
    description: 'Sorting On field.',
    required: true,
    schema: {
      type: 'string',
      enum: ['name', 'created_at', 'updated_at'],
      default: 'created_at',
    },
  },
  sub_admin_field: {
    name: 'field',
    description: 'Sorting On field.',
    required: true,
    schema: {
      type: 'string',
      enum: ['name', 'email', 'created_at', 'updated_at', 'is_active'],
      default: 'created_at',
    },
  },
  users_field: {
    name: 'field',
    description: 'Sorting On field.',
    required: true,
    schema: {
      type: 'string',
      enum: ['name', 'email', 'created_at', 'updated_at'],
      default: 'created_at',
    },
  },
  content_pages_field: {
    name: 'field',
    description: 'Sorting On field.',
    required: true,
    schema: {
      type: 'string',
      enum: ['title', 'slug', 'updated_at', 'is_active'],
      default: 'title',
    },
  },
  countries_field: {
    name: 'field',
    description: 'Sorting On field.',
    required: true,
    schema: {
      type: 'string',
      enum: ['name', 'code', 'isd_code', 'currency_code'],
      default: 'name',
    },
  },
  states_field: {
    name: 'field',
    description: 'Sorting On field.',
    required: true,
    schema: {
      type: 'string',
      enum: ['name', 'code', 'country'],
      default: 'name',
    },
  },
  cities_field: {
    name: 'field',
    description: 'Sorting On field.',
    required: true,
    schema: {
      type: 'string',
      enum: ['name', 'state', 'country'],
      default: 'name',
    },
  },
  common_sort: {
    name: 'sort',
    description: 'Sorting Ascending: ASC, Descending: DESC',
    required: true,
    schema: {
      type: 'string',
      enum: ['ASC', 'DESC'],
      default: 'DESC',
    },
  },
  countries_sort: {
    name: 'sort',
    description: 'Sorting Ascending: ASC, Descending: DESC',
    required: true,
    schema: {
      type: 'string',
      enum: ['ASC', 'DESC'],
      default: 'ASC',
    },
  },
  limit: {
    name: 'limit',
    description: 'Limit For Pagination',
    required: true,
    schema: {
      type: 'integer',
      default: 10,
    },
  },

  page: {
    name: 'page',
    description: 'Page number For Pagination',
    required: true,
    schema: {
      type: 'integer',
      default: 1,
    },
  },

  name: {
    name: 'name',
    description: 'Filter on field: Name',
    required: false,
    schema: {
      type: 'string',
    },
  },

  email: {
    name: 'email',
    description: 'Filter on field: Email',
    required: false,
    schema: {
      type: 'string',
    },
  },

  is_active: {
    name: 'is_active',
    description: 'Filter on field: Active/Inactive',
    required: false,
    schema: {
      type: 'boolean',
    },
  },

  search: {
    name: 'search',
    description: 'Common search',
    required: false,
    schema: {
      type: 'string',
    },
  },
};
