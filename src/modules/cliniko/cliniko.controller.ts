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
   * Manual Patients Sync Endpoint:
   * Synchronizes all patients from Cliniko into application User accounts.
   * Supports optional query parameters: send_email, page, per_page, max_pages, created_since, updated_since
   */
  @Post('sync-patients')
  @HttpCode(HttpStatus.OK)
  async triggerManualPatientsSync(
    @Headers('x-api-key') apiKey?: string,
    @Query('send_email') sendEmail?: string,
    @Query('page') page?: string,
    @Query('per_page') perPage?: string,
    @Query('max_pages') maxPages?: string,
    @Query('created_since') createdSince?: string,
    @Query('updated_since') updatedSince?: string,
  ) {
    const webhookSecret = appConfig().cliniko?.webhookSecret;
    if (webhookSecret && apiKey !== webhookSecret) {
      throw new UnauthorizedException('Invalid API key.');
    }

    const result = await this.clinikoService.syncAllPatients({
      sendWelcomeEmail: sendEmail !== undefined ? sendEmail === 'true' : true,
      page: page ? parseInt(page, 10) : undefined,
      perPage: perPage ? parseInt(perPage, 10) : undefined,
      maxPages: maxPages ? parseInt(maxPages, 10) : undefined,
      createdSince,
      updatedSince,
    });
    return result;
  }

  /**
   * Status Endpoint:
   * Returns current sync states and last_synced timestamps from Redis
   */
  @Get('status')
  async getStatus() {
    const lastAppointmentSyncedAt = await this.redis.get(
      'cliniko:last_synced_at',
    );
    const lastPatientSyncedAt = await this.redis.get(
      'cliniko:patients:last_synced_at',
    );
    const isAppointmentSyncLocked = await this.redis.get(
      'cliniko:polling:lock',
    );
    const isPatientSyncLocked = await this.redis.get(
      'cliniko:patients_sync:lock',
    );

    return {
      success: true,
      lastAppointmentSyncedAt:
        lastAppointmentSyncedAt || 'Not synced yet (defaults to 15m ago)',
      lastPatientSyncedAt: lastPatientSyncedAt || 'Not synced yet',
      isAppointmentSyncing: Boolean(isAppointmentSyncLocked),
      isPatientSyncing: Boolean(isPatientSyncLocked),
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
