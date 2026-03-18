import { getEnvironmentData } from 'src/helpers/general';

export const DatabaseConfig = {
  development: {
    database: getEnvironmentData('DB_NAME'),
    dialect: 'postgres',
    port: Number(getEnvironmentData('DB_PORT')),
    username: getEnvironmentData('DB_USERNAME'),
    password: getEnvironmentData('DB_PASSWORD'),
    host: getEnvironmentData('DB_HOST'),
    logging: getEnvironmentData('NODE_ENV') === 'development' ? console.log: false,
  },
  test: {
    database: getEnvironmentData('DB_NAME'),
    dialect: 'postgres',
    port: Number(getEnvironmentData('DB_PORT')),
    username: getEnvironmentData('DB_USERNAME'),
    password: getEnvironmentData('DB_PASSWORD'),
    host: getEnvironmentData('DB_HOST'),
  },
  production: {
    database: getEnvironmentData('DB_NAME'),
    dialect: 'postgres',
    port: Number(getEnvironmentData('DB_PORT')),
    username: getEnvironmentData('DB_USERNAME'),
    password: getEnvironmentData('DB_PASSWORD'),
    host: getEnvironmentData('DB_HOST'),
  },
};
