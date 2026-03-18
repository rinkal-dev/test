import { Op } from 'sequelize';
import sequelize from 'sequelize';
import { mailConfig } from 'src/config/mail';
import 'dotenv/config';

interface pageData {
  offset: number;
  limit: number;
  page: number;
}

/**
 * Settings cache (populated by SystemSettingsService)
 * This is a module-level cache that persists across requests
 */
let _settingsCache: Map<string, string> = new Map();
let _cacheInitialized = false;

/**
 * Initialize the settings cache (called by SystemSettingsService)
 */
export const initializeSettingsCache = (settings: Map<string, string>): void => {
  _settingsCache = settings;
  _cacheInitialized = true;
};

/**
 * Update a single setting in cache (called after setting update)
 */
export const updateSettingCache = (key: string, value: string): void => {
  _settingsCache.set(key, value);
};

/**
 * Remove a setting from cache
 */
export const removeSettingCache = (key: string): void => {
  _settingsCache.delete(key);
};

/**
 * Check if cache is initialized
 */
export const isSettingsCacheInitialized = (): boolean => {
  return _cacheInitialized;
};

export const parseTimeInterval = (interval: string) => {
  const regex = /^(\d+)([smhdwMy])$/;
  const matches = interval.match(regex);

  if (matches) {
    const value = parseInt(matches[1], 10);
    const unit = matches[2];

    switch (unit) {
      case 's':
        return { ms: value * 1000, long: value + ' ' + 'Seconds' };
      case 'm':
        return { ms: value * 60000, long: value + ' ' + 'Minutes' };
      case 'h':
        return { ms: value * 3600000, long: value + ' ' + 'Hours' };
      case 'd':
        return { ms: value * 86400000, long: value + ' ' + 'Days' };
      case 'w':
        return { ms: value * 604800000, long: value + ' ' + 'Weeks' };
      case 'M':
        return { ms: value * 2592000000, long: value + ' ' + 'Months' };
      case 'y':
        return { ms: value * 31536000000, long: value + ' ' + 'Years' };
    }
  }

  return { ms: 0, long: '' }; // Invalid time interval format
};

/**
 * Get environment/setting value
 *
 * Priority:
 * 1. Database cache (if initialized and key exists)
 * 2. Environment variable (process.env)
 *
 * This allows settings to be overridden from the Admin UI
 * without modifying .env files.
 */
export const getEnvironmentData = (envVarName: string) => {
  // Check database cache first (if initialized)
  if (_cacheInitialized && _settingsCache.has(envVarName)) {
    return _settingsCache.get(envVarName);
  }

  // Fallback to environment variable
  return process.env[envVarName];
};

export const filterQueryBuilder = (filterFields) => {
  const query = {};
  if (!filterFields) return query;
  filterFields.forEach((field) => {
    // let tableField = field.alias ? `${field.alias}.${field.name}` : field.name;
    const tableField = field.name;
    if (field.requested_field_type === 'unix_timestamp') {
      // tableField = sequelize.fn(
      //   'DATE',
      //   sequelize.fn('FROM_UNIXTIME', sequelize.col(tableField)),
      // );
    } else if (field.requested_field_type === 'timestamp') {
      // tableField = sequelize.fn('DATE', sequelize.col(tableField));
      if (field.operation === 'between') {
        field.values[0] = new Date(field.values[0]);
        field.values[1] = new Date(field.values[1]);
      } else {
        field.values = new Date(field.values);
      }
    } else if (field.requested_field_type === 'boolean') {
      field.values = field.values === 'true' ? true : false;
    }

    switch (field.operation) {
      case 'is': {
        // query[tableField] = { [Op.eq]: field.values };
        query[tableField] = field.values;
        break;
      }
      case 'in': {
        query[tableField] = { [Op.in]: field.values };
        break;
      }
      case 'between': {
        query[tableField] = { [Op.between]: field.values };
        break;
      }
      case 'not_in': {
        query[tableField] = { [Op.notIn]: field.values };
        break;
      }
      case 'lt': {
        query[tableField] = { [Op.lt]: field.values };
        break;
      }
      case 'lte': {
        query[tableField] = { [Op.lte]: field.values };
        break;
      }
      case 'gt': {
        query[tableField] = { [Op.gt]: field.values };
        break;
      }
      case 'gte': {
        query[tableField] = { [Op.gte]: field.values };
        break;
      }
      case 'contains': {
        query[tableField] = { [Op.like]: `%${field.values}%` };
        break;
      }
      default: {
        break;
      }
    }
  });

  return query;
  // return sequelizeModel.findAll({
  //   where: {
  //     [Op[andOr]]: query,
  //   },
  // });
};

export const generateRandomString = (length) => {
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const charactersLength = characters.length;

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charactersLength);
    result += characters.charAt(randomIndex);
  }

  return result;
};

export const generateOTP = (): number => {
  const [min, max] =
    mailConfig.otpLength === 6 ? [100000, 900000] : [1000, 9000];

  const token = Math.floor(min + Math.random() * max);

  return token;
};

export const generateString = (len) => {
  let text = '';
  const charset = 'abcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < len; i++) {
    text += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return text;
};

/**
 * Generate a random secure password
 * @param length - Password length (default: 12)
 * @returns Random password with uppercase, lowercase, numbers, and special characters
 */
export const generateRandomPassword = (length: number = 8): string => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%&*';
  const allChars = uppercase + lowercase + numbers + special;

  // Ensure at least one of each type
  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  // Fill remaining characters
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

// Offset Counter
export const offsetCount = (page: number, limit: number) => {
  const pageData: pageData = {
    offset: 0,
    limit: limit,
    page: 0,
  };
  if (!page || page == 0) {
    pageData.page = 1;
    return pageData;
  } else {
    pageData.offset = (page - 1) * pageData.limit;
    pageData.page = Number(page);
    return pageData;
  }
};
