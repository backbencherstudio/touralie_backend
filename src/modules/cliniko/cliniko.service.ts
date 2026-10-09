import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import axios, { AxiosInstance } from 'axios';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import appConfig from '../../config/app.config';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import { Role } from '../../common/guard/role/role.enum';
import {
  ClinikoAppointment,
  ClinikoAppointmentsResponse,
  ClinikoPatient,
  ClinikoSyncResult,
} from './cliniko.interface';

@Injectable()
export class ClinikoService {
  private readonly logger = new Logger(ClinikoService.name);

  // Redis state keys and TTLs
  private readonly LAST_SYNCED_KEY = 'cliniko:last_synced_at';
  private readonly LOCK_KEY = 'cliniko:polling:lock';
  private readonly LOCK_TTL_SECONDS = 240; // 4 minutes (cron runs every 5 minutes)
  private readonly PATIENT_CACHE_PREFIX = 'cliniko:patient:synced:';
  private readonly PATIENT_CACHE_TTL_SECONDS = 86400; // 24 hours

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  /**
   * Helper to construct configured Axios client for Cliniko API
   */
  private getApiClient(): { client: AxiosInstance; baseUrl: string } | null {
    const config = appConfig().cliniko;
    const apiKey = config?.apiKey;
    const shard = config?.shard || 'au1';
    const vendor = config?.vendor || 'Touralie (admin@touralie.com)';

    if (!apiKey) {
      this.logger.warn('Cliniko API Key is not configured. Polling skipped.');
      return null;
    }

    const baseUrl = `https://api.${shard}.cliniko.com/v1`;
    const basicAuth = Buffer.from(`${apiKey}:`).toString('base64');

    const client = axios.create({
      baseURL: baseUrl,
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'User-Agent': vendor,
        Accept: 'application/json',
      },
      timeout: 15000,
    });

    return { client, baseUrl };
  }

  /**
   * Cron Job: Runs every 5 minutes to poll newly created appointments in Cliniko
   */
  @Cron(CronExpression.EVERY_5_SECONDS)
  async handleCronPoll(): Promise<void> {
    this.logger.log('Starting scheduled Cliniko appointment polling...');
    await this.syncAppointments();
  }

  /**
   * Core Sync Logic:
   * Polls Cliniko appointments created since last sync, dedupes patients,
   * checks Redis cache, batch-verifies DB users, and syncs/creates User records.
   */
  async syncAppointments(forcedSince?: string): Promise<ClinikoSyncResult> {
    const api = this.getApiClient();
    if (!api) {
      return {
        success: false,
        syncedCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        totalAppointments: 0,
        message: 'Cliniko API key is missing or unconfigured.',
      };
    }

    // 1. Acquire Distributed Lock in Redis to prevent concurrent runs across instances
    const lockToken = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    const lockAcquired = await this.redis.set(
      this.LOCK_KEY,
      lockToken,
      'EX',
      this.LOCK_TTL_SECONDS,
      'NX',
    );

    if (!lockAcquired) {
      this.logger.debug(
        'Cliniko polling lock is currently held by another worker instance. Skipping run.',
      );
      return {
        success: false,
        syncedCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        totalAppointments: 0,
        message: 'Lock held by another instance.',
      };
    }

    const syncExecutionStartTime = new Date().toISOString();
    let latestAppointmentCreatedAt: string | null = null;
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let totalAppointments = 0;

    try {
      // 2. Retrieve last_synced_at from Redis (default: 15 minutes ago)
      let sinceTimestamp = forcedSince;
      if (!sinceTimestamp) {
        const storedLastSynced = await this.redis.get(this.LAST_SYNCED_KEY);
        if (storedLastSynced) {
          sinceTimestamp = storedLastSynced;
        } else {
          // Default to 15 minutes ago
          sinceTimestamp = new Date(Date.now() - 15 * 60 * 1000).toISOString();
        }
      }

      this.logger.log(
        `Fetching Cliniko appointments created after: ${sinceTimestamp}`,
      );

      // 3. Fetch appointments from Cliniko with rate-limit headers & query filter
      const appointmentsResponse =
        await api.client.get<ClinikoAppointmentsResponse>(
          '/individual_appointments',
          {
            params: {
              'q[]': `created_at:>${sinceTimestamp}`,
              sort: 'created_at:asc',
              per_page: 100,
            },
          },
        );

      const appointments =
        appointmentsResponse.data?.individual_appointments || [];
      totalAppointments = appointments.length;

      if (appointments.length === 0) {
        this.logger.log('No new Cliniko appointments found.');
        // Advance sync checkpoint to execution start time
        await this.redis.set(this.LAST_SYNCED_KEY, syncExecutionStartTime);
        return {
          success: true,
          syncedCount: 0,
          updatedCount: 0,
          skippedCount: 0,
          totalAppointments: 0,
          lastSyncedAt: syncExecutionStartTime,
          message: 'No new appointments found.',
        };
      }

      // Track the most recent appointment timestamp
      latestAppointmentCreatedAt =
        appointments[appointments.length - 1].created_at;

      // 4. In-Memory Deduplication: Extract unique patient IDs
      const uniquePatientIds = new Set<string>();
      for (const appt of appointments) {
        const patientId = this.extractPatientId(appt);
        if (patientId) {
          uniquePatientIds.add(patientId);
        }
      }

      if (uniquePatientIds.size === 0) {
        this.logger.log(
          'Appointments found, but none contained valid patient references.',
        );
        await this.redis.set(
          this.LAST_SYNCED_KEY,
          latestAppointmentCreatedAt || syncExecutionStartTime,
        );
        return {
          success: true,
          syncedCount: 0,
          updatedCount: 0,
          skippedCount: 0,
          totalAppointments,
          message: 'No patient references in appointments.',
        };
      }

      // 5. Cache Optimization: Check Redis to skip recently synced patients (24h TTL)
      const patientIdsToFetch: string[] = [];
      for (const patientId of uniquePatientIds) {
        const isCached = await this.redis.get(
          `${this.PATIENT_CACHE_PREFIX}${patientId}`,
        );
        if (isCached) {
          skippedCount++;
        } else {
          patientIdsToFetch.push(patientId);
        }
      }

      if (patientIdsToFetch.length === 0) {
        this.logger.log(
          `All ${uniquePatientIds.size} patient(s) were already synced recently (cached in Redis).`,
        );
        await this.redis.set(
          this.LAST_SYNCED_KEY,
          latestAppointmentCreatedAt || syncExecutionStartTime,
        );
        return {
          success: true,
          syncedCount: 0,
          updatedCount: 0,
          skippedCount,
          totalAppointments,
          lastSyncedAt: latestAppointmentCreatedAt || syncExecutionStartTime,
          message: 'All patients already synced in cache.',
        };
      }

      this.logger.log(
        `Fetching details for ${patientIdsToFetch.length} uncached patient(s) from Cliniko...`,
      );

      // 6. Fetch patient details with controlled concurrency (chunks of 5 to protect rate limits)
      const fetchedPatients = await this.fetchPatientsBatch(
        api.client,
        patientIdsToFetch,
      );

      // Filter valid patients who have email
      const validPatients = fetchedPatients.filter((p) => {
        if (!p.email) {
          this.logger.warn(
            `Patient Cliniko ID ${p.id} (${p.first_name || ''} ${p.last_name || ''}) has no email. Skipping user creation.`,
          );
          return false;
        }
        return true;
      });

      if (validPatients.length === 0) {
        this.logger.log('None of the fetched patients had an email address.');
        await this.redis.set(
          this.LAST_SYNCED_KEY,
          latestAppointmentCreatedAt || syncExecutionStartTime,
        );
        return {
          success: true,
          syncedCount: 0,
          updatedCount: 0,
          skippedCount,
          totalAppointments,
          message: 'No patients with email to sync.',
        };
      }

      // 7. Single Batch Query to PostgreSQL to find existing users by cliniko_patient_id or email
      const candidatePatientIds = validPatients.map((p) => String(p.id));
      const candidateEmails = validPatients.map((p) =>
        p.email!.toLowerCase().trim(),
      );

      const existingUsers = await this.prisma.user.findMany({
        where: {
          OR: [
            { cliniko_patient_id: { in: candidatePatientIds } },
            { email: { in: candidateEmails } },
          ],
        },
        select: {
          id: true,
          email: true,
          name: true,
          first_name: true,
          last_name: true,
          cliniko_patient_id: true,
        },
      });

      const userByClinikoId = new Map<string, (typeof existingUsers)[0]>();
      const userByEmail = new Map<string, (typeof existingUsers)[0]>();

      for (const u of existingUsers) {
        if (u.cliniko_patient_id) {
          userByClinikoId.set(u.cliniko_patient_id, u);
        }
        if (u.email) {
          userByEmail.set(u.email.toLowerCase().trim(), u);
        }
      }

      // 8. Batch DB Writes & Redis Cache Updates
      for (const patient of validPatients) {
        const patientIdStr = String(patient.id);
        const emailLower = patient.email!.toLowerCase().trim();

        const userByCliniko = userByClinikoId.get(patientIdStr);
        const userByEmailMatch = userByEmail.get(emailLower);

        if (userByCliniko) {
          // User already exists and linked with this Cliniko ID
          skippedCount++;
          await this.cacheSyncedPatient(patientIdStr);
          continue;
        }

        if (userByEmailMatch) {
          // User exists by email, link Cliniko Patient ID
          await this.prisma.user.update({
            where: { id: userByEmailMatch.id },
            data: {
              cliniko_patient_id: patientIdStr,
              first_name: userByEmailMatch.first_name ?? patient.first_name,
              last_name: userByEmailMatch.last_name ?? patient.last_name,
              phone_number:
                patient.patient_phone_numbers?.[0]?.number ?? undefined,
            },
          });
          updatedCount++;
          await this.cacheSyncedPatient(patientIdStr);
          this.logger.log(
            `Linked existing user ${emailLower} with Cliniko patient ID ${patientIdStr}.`,
          );
          continue;
        }

        // Determine password: use patient's date of birth (e.g. YYYY-MM-DD) or fallback
        const isDobPassword = Boolean(patient.date_of_birth);
        const plainPassword = patient.date_of_birth
          ? String(patient.date_of_birth).trim()
          : `Touralie@${new Date().getFullYear()}`;

        const hashedPassword = await bcrypt.hash(
          plainPassword,
          appConfig().security.salt || 10,
        );

        // Create new patient User with active status, verified email, and password change flag
        const fullName =
          `${patient.first_name || ''} ${patient.last_name || ''}`.trim() ||
          'Patient';

        const newUser = await this.prisma.user.create({
          data: {
            name: fullName,
            first_name: patient.first_name || null,
            last_name: patient.last_name || null,
            email: emailLower,
            phone_number: patient.patient_phone_numbers?.[0]?.number || null,
            date_of_birth: patient.date_of_birth
              ? new Date(patient.date_of_birth)
              : null,
            gender: patient.gender_identity || patient.sex || null,
            cliniko_patient_id: patientIdStr,
            password: hashedPassword,
            type: Role.USER,
            status: 1, // Active account
            email_verified_at: new Date(), // Email verified so user can log in immediately
          },
        });

        createdCount++;
        await this.cacheSyncedPatient(patientIdStr);
        this.logger.log(
          `Created new user ${emailLower} (ID: ${newUser.id}) from Cliniko patient ${patientIdStr}.`,
        );

        // Send welcome email with login credentials and DOB password
        try {
          if (newUser.email) {
            const loginUrl = `${appConfig().app.client_app_url}/login`;
            await this.mailService.sendPatientWelcomeCredentials({
              name: newUser.name || 'Patient',
              email: newUser.email,
              password: plainPassword,
              loginUrl,
              isDobPassword,
            });
            this.logger.log(
              `Queued welcome credentials email for patient ${newUser.email}`,
            );
          }
        } catch (mailErr) {
          this.logger.warn(
            `Failed to send welcome email to ${newUser.email}: ${mailErr.message}`,
          );
        }
      }

      // 10. Update last_synced_at in Redis to the latest appointment created_at
      const nextSyncTimestamp =
        latestAppointmentCreatedAt || syncExecutionStartTime;
      await this.redis.set(this.LAST_SYNCED_KEY, nextSyncTimestamp);

      this.logger.log(
        `Cliniko sync completed: ${createdCount} created, ${updatedCount} updated, ${skippedCount} skipped. Next sync checkpoint: ${nextSyncTimestamp}`,
      );

      return {
        success: true,
        syncedCount: createdCount,
        updatedCount,
        skippedCount,
        totalAppointments,
        lastSyncedAt: nextSyncTimestamp,
        message: 'Sync completed successfully.',
      };
    } catch (error) {
      this.logger.error(
        'Error during Cliniko appointment sync:',
        error.stack || error.message,
      );
      return {
        success: false,
        syncedCount: createdCount,
        updatedCount,
        skippedCount,
        totalAppointments,
        message: error.message || 'Unknown error occurred during sync.',
      };
    } finally {
      // 11. Release Redis distributed lock safely
      try {
        const currentLockToken = await this.redis.get(this.LOCK_KEY);
        if (currentLockToken === lockToken) {
          await this.redis.del(this.LOCK_KEY);
        }
      } catch (lockReleaseErr) {
        this.logger.error('Failed to release Redis lock:', lockReleaseErr);
      }
    }
  }

  /**
   * Helper: Extracts patient ID from appointment object or links.self URL
   */
  private extractPatientId(appointment: ClinikoAppointment): string | null {
    if (appointment.patient?.id) {
      return String(appointment.patient.id);
    }
    const selfLink = appointment.patient?.links?.self;
    if (selfLink) {
      const match = selfLink.match(/\/patients\/(\d+)/);
      if (match) {
        return match[1];
      }
    }
    return null;
  }

  /**
   * Helper: Cache synced patient ID in Redis with 24-hour expiration
   */
  private async cacheSyncedPatient(patientId: string): Promise<void> {
    try {
      await this.redis.set(
        `${this.PATIENT_CACHE_PREFIX}${patientId}`,
        '1',
        'EX',
        this.PATIENT_CACHE_TTL_SECONDS,
      );
    } catch (err) {
      this.logger.warn(
        `Failed to set Redis cache for patient ${patientId}: ${err.message}`,
      );
    }
  }

  /**
   * Helper: Fetch patient details in concurrency chunks of 5
   */
  private async fetchPatientsBatch(
    client: AxiosInstance,
    patientIds: string[],
  ): Promise<ClinikoPatient[]> {
    const results: ClinikoPatient[] = [];
    const chunkSize = 5;

    for (let i = 0; i < patientIds.length; i += chunkSize) {
      const chunk = patientIds.slice(i, i + chunkSize);
      const promises = chunk.map(async (id) => {
        try {
          const res = await client.get<ClinikoPatient>(`/patients/${id}`);
          return res.data;
        } catch (err) {
          this.logger.error(
            `Failed to fetch patient ${id} from Cliniko: ${err.response?.status || err.message}`,
          );
          return null;
        }
      });

      const chunkResults = await Promise.all(promises);
      for (const item of chunkResults) {
        if (item) results.push(item);
      }
    }

    return results;
  }
}
