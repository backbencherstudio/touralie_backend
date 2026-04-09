import 'dotenv/config';
import { Module } from '@nestjs/common';
import { CommandFactory } from 'nest-commander';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '@nestjs-modules/ioredis';

// internal imports
import { PrismaService } from './prisma/prisma.service';
import { SeedCommand } from './command/seed.command';
import { RepositoryModule } from './common/repository/repository.module';
import appConfig from './config/app.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
    }),
    RedisModule.forRoot({
      type: 'single',
      options: {
        host: appConfig().redis.host,
        password: appConfig().redis.password,
        port: +appConfig().redis.port,
      },
    }),
    RepositoryModule,
  ],
  providers: [SeedCommand],
})
export class AppModule {}

async function bootstrap() {
  await CommandFactory.run(AppModule, [
    'error',
    'warn',
    'debug',
    'log',
    'verbose',
  ]).catch((err) => {
    console.error('Bootstrap error:', err);
    process.exit(1);
  });
}

bootstrap();
