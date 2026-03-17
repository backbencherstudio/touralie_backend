import 'dotenv/config';
import { Module } from '@nestjs/common';
import { CommandFactory } from 'nest-commander';
// internal imports
import { PrismaService } from './prisma/prisma.service';
import { SeedCommand } from './command/seed.command';
import { RepositoryModule } from './common/repository/repository.module';

@Module({
  imports: [RepositoryModule],
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
