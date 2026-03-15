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
  app.enableCors();
  app.use(helmet());
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
    driver: 'local',
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
    .setTitle(`${process.env.APP_NAME} API`)
    .setDescription(`${process.env.APP_NAME} API Docs`)
    .setVersion('1.0')
    .addTag(`${process.env.APP_NAME}`)
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'user_token',
    ) // Adds user_token as Bearer Auth
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'admin_token',
    ) // Adds admin_token as Bearer Auth
    .build();

  const document = SwaggerModule.createDocument(app, options);

  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      responseInterceptor: (response) => {
        // Check if the response is from the login endpoint
        if (response.url.includes('/auth/login') && response.status === 200) {
          const data = JSON.parse(response.data);
          const userToken = data.authorization.access_token;
          const adminToken = data.authorization.access_token;

          // Automatically set the token based on user type (either 'user' or 'admin')
          if (userToken && data.type === 'user') {
            (window as any).ui.preauthorizeApiKey('user_token', userToken); // Set user_token
          } else if (adminToken && data.type === 'admin') {
            (window as any).ui.preauthorizeApiKey('admin_token', adminToken); // Set admin_token
          }
        }
        return response;
      },
    },
  });

  // end swagger

  await app.listen(process.env.PORT ?? 4000, '0.0.0.0', () => {
    console.log(`Application is running on port: ${process.env.PORT}`);
  });
}
bootstrap();
