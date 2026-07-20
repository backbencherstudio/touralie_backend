import 'dotenv/config';
// external imports
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { join } from 'path';
// import express from 'express';
// internal imports
import { AppModule } from './app.module';
import appConfig from './config/app.config';
import { CustomExceptionFilter } from './common/exception/custom-exception.filter';
import { SojebStorage } from './common/lib/Disk/SojebStorage';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  // Handle raw body for webhooks
  // app.use('/payment/stripe/webhook', express.raw({ type: 'application/json' }));

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: [
      'https://dashboard.irclinic.com.au',
      'http://dashboard.irclinic.com.au',
      'https://www.dashboard.irclinic.com.au',
      'http://www.dashboard.irclinic.com.au',
      'http://localhost:3001',
      'http://localhost:3000',
      'http://localhost:5500',
      appConfig().app.client_app_url || '',
    ],
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });
  app.use(
    helmet({
      contentSecurityPolicy: false, // Disable CSP to ensure Swagger UI assets load
    }),
  );
  // Enable it, if special charactrers not encoding perfectly
  // app.use((req, res, next) => {
  //   // Only force content-type for specific API routes, not Swagger or assets
  //   if (req.path.startsWith('/api') && !req.path.startsWith('/api/docs')) {
  //     res.setHeader('Content-Type', 'application/json; charset=utf-8');
  //   }
  //   next();
  // });
  app.useStaticAssets(join(__dirname, '..', 'public'), {
    index: false,
    prefix: '/public',
  });
  app.useStaticAssets(join(__dirname, '..', 'public/storage'), {
    index: false,
    prefix: '/storage',
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );
  app.useGlobalFilters(new CustomExceptionFilter());

  // storage setup
  SojebStorage.config({
    driver: 's3',
    connection: {
      rootUrl: appConfig().storageUrl.rootUrl,
      publicUrl: appConfig().storageUrl.rootUrlPublic,
      // aws s3
      awsBucket: appConfig().fileSystems.s3.bucket,
      awsAccessKeyId: appConfig().fileSystems.s3.key,
      awsSecretAccessKey: appConfig().fileSystems.s3.secret,
      awsDefaultRegion: appConfig().fileSystems.s3.region,
      awsEndpoint: appConfig().fileSystems.s3.endpoint,
      minio: true,
      // google cloud storage
      gcpProjectId: appConfig().fileSystems.gcs.projectId,
      gcpKeyFile: appConfig().fileSystems.gcs.keyFile,
      gcpApiEndpoint: appConfig().fileSystems.gcs.apiEndpoint,
      gcpBucket: appConfig().fileSystems.gcs.bucket,
    },
  });

  // Swagger setup
  const options = new DocumentBuilder()
    .setTitle(`${appConfig().app.name} API`)
    .setDescription(`${appConfig().app.name} API Docs`)
    .setVersion('1.0')
    // .addTag(`${appConfig().app.name}`)
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'user_token',
    )
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'admin_token',
    )
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'practitioner_token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, options);

  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: `${appConfig().app.name?.toUpperCase()} API`,
    swaggerOptions: {
      docExpansion: 'none',
      persistAuthorization: true,
      defaultModelsExpandDepth: -1,
    },
    customJsStr: `
      window.addEventListener('load', function () {
        var originalFetch = window.fetch;
        window.fetch = function () {
          return originalFetch.apply(this, arguments).then(function (response) {
            var url = response.url || '';
            if (url.indexOf('/auth/login') !== -1) {
              response.clone().json().then(function (data) {
                var token = data && data.authorization && data.authorization.access_token;
                var type = data && data.type;
                if (!token) return;

                var key =
                  type === 'admin' || type === 'su_admin'
                    ? 'admin_token'
                    : type === 'practitioner'
                    ? 'practitioner_token'
                    : 'user_token';

                var ui = window.ui;
                if (ui) {
                  var authObj = {};
                  authObj[key] = {
                    name: key,
                    schema: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
                    value: token,
                  };
                  ui.authActions.authorize(authObj);

                  try {
                    var currentAuth = window.localStorage.getItem('authorized');
                    var parsedAuth = currentAuth ? JSON.parse(currentAuth) : {};
                    parsedAuth[key] = authObj[key];
                    window.localStorage.setItem('authorized', JSON.stringify(parsedAuth));
                    console.log('Token auto-saved for: ' + key);
                  } catch (e) {
                    console.error('Failed to persist token', e);
                  }
                }
              }).catch(function () {});
            }
            return response;
          });
        };
      });
    `,
  });

  // end swagger

  await app.listen(process.env.PORT ?? 4000, '0.0.0.0', () => {
    console.log(`Application is running on port: ${process.env.PORT}`);
  });
}
bootstrap();
