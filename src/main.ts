import { HttpStatus, ValidationPipe, VersioningType } from '@nestjs/common';
import * as fs from 'fs';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import {
  DocumentBuilder,
  SwaggerDocumentOptions,
  SwaggerModule,
} from '@nestjs/swagger';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const express = require('express');
import { json, urlencoded, Request, Response, NextFunction } from 'express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AppModule } from './app.module';
import { ValidationExceptionFilter } from './exceptions/validation.filter';
import { AllExceptionsFilter } from './core/logging/http-exception.filter';
import { PermissionModule } from './modules/admin/permissions/permissions.module';
import { RolesModule } from './modules/admin/roles/roles.module';
import { SubAdminModule } from './modules/admin/sub-admins/sub-admins.module';
import { AdminAuthModule } from './modules/admin/admin-auth/admin-auth.module';
import { CountriesModule } from './modules/admin/countries/countries.module';
import { StatesModule } from './modules/admin/states/states.module';
import { CitiesModule } from './modules/admin/cities/cities.module';
import { UsersModule } from './modules/admin/users/users.module';
import { ContentPagesModule } from './modules/admin/content-pages/content-pages.module';
import { AppSettingsModule } from './modules/admin/app-settings/app-settings.module';
import { ProfilesModule } from './modules/admin/profiles/profiles.module';
import { getEnvironmentData } from './helpers/general';
import { logger } from './core/logging/winston.config';

const server = express();

async function bootstrap() {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    rawBody: true,
    cors: {
      origin: '*',
    },
    ...(getEnvironmentData('ENABLE_HTTPS') == 'true' && {
      httpsOptions: {
        key: fs.readFileSync(getEnvironmentData('SERVER_PRIVATE_KEY_PATH')),
        cert: fs.readFileSync(getEnvironmentData('SERVER_CERTIFICATE_PATH')),
      },
    }),
  });

  // ============================================
  // SECURITY: Block access to sensitive files
  // ============================================
  app.use((req: Request, res: Response, next: NextFunction) => {
    const blockedPatterns = [
      /\.env/i,           // .env files
      /\.git/i,           // Git directory
      /\.htaccess/i,      // Apache config
      /\.htpasswd/i,      // Apache passwords
      /composer\.(json|lock)/i,  // PHP dependencies
      /package\.json/i,   // Node dependencies (optional)
      /\.sql/i,           // SQL files
      /\.bak/i,           // Backup files
      /\.log/i,           // Log files
      /\.ini/i,           // Config files
      /\.conf/i,          // Config files
      /\.yml/i,           // YAML config (except API docs)
      /\.yaml/i,          // YAML config
      /docker-compose/i,  // Docker files
      /Dockerfile/i,      // Docker files
      /\.pem/i,           // SSL certificates
      /\.key/i,           // Private keys
    ];

    const url = decodeURIComponent(req.url);
    const isBlocked = blockedPatterns.some(pattern => pattern.test(url));

    if (isBlocked) {
      return res.status(403).json({
        statusCode: 403,
        message: 'Access denied',
      });
    }

    next();
  });

  // Increase body size limit for base64 images (50MB)
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  app.setGlobalPrefix(getEnvironmentData('APP_PREFIX'));

  app.enableVersioning({
    type: VersioningType.URI,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      stopAtFirstError: true,
      transform: true,
    }),
  );

  // Use Winston for NestJS logging
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  // Global exception filter for logging all errors
  app.useGlobalFilters(
    new AllExceptionsFilter(app.get('winston')),
    new ValidationExceptionFilter(),
  );

  const config = new DocumentBuilder()
    .setTitle(getEnvironmentData('APP_NAME'))
    .setDescription(getEnvironmentData('SWAGGER_PROJECT_BRIEF'))
    .setVersion(getEnvironmentData('SWAGGER_API_VERSION'))
    .addBearerAuth()
    .addServer(getEnvironmentData('APP_URL'))
    .build();
  const document = SwaggerModule.createDocument(app, config);
  const swaggerCdnOptions = {
    customCssUrl: 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.11.0/swagger-ui.css',
    customJs: [
      'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.11.0/swagger-ui-bundle.js',
      'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.11.0/swagger-ui-standalone-preset.js',
    ],
  };
  SwaggerModule.setup('api/v1/documentation', app, document, swaggerCdnOptions);
  // Swagger JSON endpoints for API client generation (Orval)
  app.use('/swagger.json', (req, res) => {
    res.json(document);
  });
  app.use('/api-json', (req, res) => {
    res.json(documentAdmin);
  });

  const option: SwaggerDocumentOptions = {
    include: [
      AdminAuthModule,
      PermissionModule,
      RolesModule,
      SubAdminModule,
      CountriesModule,
      StatesModule,
      CitiesModule,
      UsersModule,
      ContentPagesModule,
      AppSettingsModule,
      ProfilesModule,
    ],
    deepScanRoutes: true,
  };
  const documentAdmin = SwaggerModule.createDocument(app, config, option);
  SwaggerModule.setup('api/v1/admin/documentation', app, documentAdmin, swaggerCdnOptions);
  app.use('/admin/swagger.json', (req, res) => {
    res.json(documentAdmin);
  });

  await app.init();

  // Only listen on a port when running locally (not on Vercel)
  if (!process.env.VERCEL) {
    const port = getEnvironmentData('APP_PORT');
    await app.listen(port);

    // Log startup information
    const env = getEnvironmentData('NODE_ENV') || 'development';
    logger.info(`Application started`, {
      port,
      environment: env,
      prefix: getEnvironmentData('APP_PREFIX'),
      url: getEnvironmentData('APP_URL'),
    });
    console.log(`Application is running on: ${getEnvironmentData('APP_URL')}`);
    console.log(`Environment: ${env}`);
    console.log(`Logs available at: /api/v1/admin/logs (admin auth required)`);
  }
}
const bootstrapPromise = bootstrap();

// Export a handler that waits for NestJS to initialize before handling requests
export default async (req, res) => {
  await bootstrapPromise;
  server(req, res);
};
