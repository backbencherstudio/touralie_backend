import {
  Controller,
  Post,
  Get,
  Headers,
  Query,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ClinikoService } from './cliniko.service';
import appConfig from '../../config/app.config';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Controller('api/cliniko')
export class ClinikoController {
  constructor(
    private readonly clinikoService: ClinikoService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  /**
   * Manual Sync Endpoint:
   * Allows triggering an immediate sync (e.g. for testing or on-demand admin action)
   */
  @Post('sync')
  @HttpCode(HttpStatus.OK)
  async triggerManualSync(
    @Headers('x-api-key') apiKey?: string,
    @Query('since') since?: string,
  ) {
    const webhookSecret = appConfig().cliniko?.webhookSecret;
    if (webhookSecret && apiKey !== webhookSecret) {
      throw new UnauthorizedException('Invalid API key.');
    }

    const result = await this.clinikoService.syncAppointments(since);
    return result;
  }

  /**
   * Status Endpoint:
   * Returns current sync state and last_synced_at timestamp from Redis
   */
  @Get('status')
  async getStatus() {
    const lastSyncedAt = await this.redis.get('cliniko:last_synced_at');
    const isLocked = await this.redis.get('cliniko:polling:lock');

    return {
      success: true,
      lastSyncedAt: lastSyncedAt || 'Not synced yet (defaults to 15m ago)',
      isCurrentlySyncing: Boolean(isLocked),
    };
  }

  /**
   * Webhook Endpoint (optional real-time fallback):
   * Can be triggered by third-party webhook relays if needed
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Headers('x-api-key') apiKey: string) {
    const webhookSecret = appConfig().cliniko?.webhookSecret;
    if (webhookSecret && apiKey !== webhookSecret) {
      throw new UnauthorizedException('Invalid webhook secret.');
    }

    // Trigger immediate sync
    const result = await this.clinikoService.syncAppointments();
    return {
      status: 'success',
      syncResult: result,
    };
  }
}
