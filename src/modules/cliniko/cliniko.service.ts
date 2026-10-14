import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
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
  ClinikoPatientsResponse,
  ClinikoPatientSyncResult,
  ClinikoSyncPatientsOptions,
  ClinikoSyncResult,
} from './cliniko.interface';

@Injectable()
export class ClinikoService {
  private readonly logger = new Logger(ClinikoService.name);

  // Redis state keys and TTLs
  private readonly LAST_SYNCED_KEY = 'cliniko:last_synced_at';
  private readonly LOCK_KEY = 'cliniko:polling:lock';
  private readonly LOCK_TTL_SECONDS = 240; // 4 minutes (cron runs every 10 minutes)
  private readonly PATIENTS_SYNC_LOCK_KEY = 'cliniko:patients_sync:lock';
  private readonly PATIENTS_SYNC_LOCK_TTL_SECONDS = 900; // 15 minutes
  private readonly PATIENTS_LAST_SYNCED_KEY = 'cliniko:patients:last_synced_at';
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
      timeout: 20000,
    });

    return { client, baseUrl };
  }

  /**
   * Cron Job: Runs every 10 minutes to poll newly created appointments in Cliniko
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleCronPoll(): Promise<void> {
    this.logger.log('Starting scheduled Cliniko appointment polling...');
    await this.syncAppointments();
  }

  /**
   * Core Appointment Sync Logic:
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
        'Cliniko appointment polling lock is currently held by another worker instance. Skipping run.',
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
          sinceTimestamp = new Date(Date.now() - 15 * 60 * 1000).toISOString();
        }
      }

      this.logger.log(
        `Fetching Cliniko appointments created after: ${sinceTimestamp}`,
      );

      // 3. Fetch appointments from Cliniko with rate-limit headers & query filter
      const appointmentsResponse = await this.fetchWithRetry(() =>
        api.client.get<ClinikoAppointmentsResponse>(
          '/individual_appointments',
          {
            params: {
              'q[]': `created_at:>${sinceTimestamp}`,
              sort: 'created_at:asc',
              per_page: 100,
            },
          },
        ),
      );

      const appointments =
        appointmentsResponse.data?.individual_appointments || [];
      totalAppointments = appointments.length;

      if (appointments.length === 0) {
        this.logger.log('No new Cliniko appointments found.');
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

      // 6. Fetch patient details with controlled concurrency
      const fetchedPatients = await this.fetchPatientsBatch(
        api.client,
        patientIdsToFetch,
      );

      // 7. Process fetched patients (creates/links users, hashes password, queues welcome email, caches in Redis)
      const batchResult = await this.processPatients(fetchedPatients, {
        sendWelcomeEmail: true,
      });

      createdCount = batchResult.createdCount;
      updatedCount = batchResult.updatedCount;
      skippedCount += batchResult.skippedCount;

      // 8. Update last_synced_at in Redis to the latest appointment created_at
      const nextSyncTimestamp =
        latestAppointmentCreatedAt || syncExecutionStartTime;
      await this.redis.set(this.LAST_SYNCED_KEY, nextSyncTimestamp);

      this.logger.log(
        `Cliniko appointment sync completed: ${createdCount} created, ${updatedCount} updated, ${skippedCount} skipped. Next sync checkpoint: ${nextSyncTimestamp}`,
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
      // 9. Release Redis distributed lock safely
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
   * Sync All Patients from Cliniko:
   * Paginates through all patient records in Cliniko (/patients),
   * creates user accounts for unsynced patients, links existing ones by email,
   * handles Cliniko rate limits with retry/reset headers, and uses distributed locks.
   */
  async syncAllPatients(
    options?: ClinikoSyncPatientsOptions,
  ): Promise<ClinikoPatientSyncResult> {
    const api = this.getApiClient();
    if (!api) {
      return {
        success: false,
        totalProcessed: 0,
        syncedCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        failedCount: 0,
        pagesProcessed: 0,
        message: 'Cliniko API key is missing or unconfigured.',
      };
    }

    // 1. Acquire Distributed Lock in Redis to prevent concurrent full sync runs
    const lockToken = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    const lockAcquired = await this.redis.set(
      this.PATIENTS_SYNC_LOCK_KEY,
      lockToken,
      'EX',
      this.PATIENTS_SYNC_LOCK_TTL_SECONDS,
      'NX',
    );

    if (!lockAcquired) {
      this.logger.warn(
        'Cliniko patient sync lock is currently held by another worker instance. Skipping run.',
      );
      return {
        success: false,
        totalProcessed: 0,
        syncedCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        failedCount: 0,
        pagesProcessed: 0,
        message: 'Patient sync lock held by another instance.',
      };
    }

    const syncExecutionStartTime = new Date().toISOString();
    let totalProcessed = 0;
    let totalCreated = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    let totalFailed = 0;
    let pagesProcessed = 0;
    let totalEntries: number | undefined;

    const perPage = Math.min(Math.max(options?.perPage || 100, 1), 100);
    const maxPages = options?.maxPages || Infinity;
    let currentPage = options?.page || 1;
    let hasMore = true;

    this.logger.log(
      `Starting Cliniko full patient sync (start page: ${currentPage}, per_page: ${perPage})...`,
    );

    try {
      while (hasMore) {
        // Renew distributed lock heartbeat on each page
        await this.redis.expire(
          this.PATIENTS_SYNC_LOCK_KEY,
          this.PATIENTS_SYNC_LOCK_TTL_SECONDS,
        );

        this.logger.log(`Fetching Cliniko patients page ${currentPage}...`);

        const params: Record<string, any> = {
          page: currentPage,
          per_page: perPage,
          sort: 'created_at:asc',
        };
        if (options?.createdSince) {
          params['q[]'] = `created_at:>=${options.createdSince}`;
        } else if (options?.updatedSince) {
          params['q[]'] = `updated_at:>=${options.updatedSince}`;
        }

        const response: AxiosResponse<ClinikoPatientsResponse> =
          await this.fetchWithRetry(() =>
            api.client.get<ClinikoPatientsResponse>('/patients', { params }),
          );

        const patients = response.data?.patients || [];
        totalEntries = response.data?.total_entries ?? totalEntries;

        if (patients.length === 0) {
          this.logger.log('No more Cliniko patients returned on this page.');
          hasMore = false;
          break;
        }

        const batchResult = await this.processPatients(patients, {
          sendWelcomeEmail: options?.sendWelcomeEmail,
        });

        totalProcessed += patients.length;
        totalCreated += batchResult.createdCount;
        totalUpdated += batchResult.updatedCount;
        totalSkipped += batchResult.skippedCount;
        totalFailed += batchResult.failedCount;
        pagesProcessed++;

        this.logger.log(
          `Cliniko patients page ${currentPage} processed: ${batchResult.createdCount} created, ${batchResult.updatedCount} updated, ${batchResult.skippedCount} skipped, ${batchResult.failedCount} failed. Progress: ${totalProcessed}/${totalEntries ?? 'unknown'}`,
        );

        if (pagesProcessed >= maxPages) {
          this.logger.log(
            `Reached maximum configured pages limit (${maxPages}).`,
          );
          hasMore = false;
          break;
        }

        // Check if Cliniko provided a next page link
        if (response.data?.links?.next) {
          currentPage++;
        } else {
          hasMore = false;
          break;
        }

        // Polite delay (150ms) to respect rate limits (Cliniko allows up to 200 req/min)
        await this.sleep(150);
      }

      await this.redis.set(
        this.PATIENTS_LAST_SYNCED_KEY,
        syncExecutionStartTime,
      );

      const summaryMessage = `Cliniko patient sync finished: ${totalCreated} created, ${totalUpdated} updated, ${totalSkipped} skipped, ${totalFailed} failed across ${pagesProcessed} page(s) (${totalProcessed} total processed).`;
      this.logger.log(summaryMessage);

      return {
        success: true,
        totalPatientsInCliniko: totalEntries,
        totalProcessed,
        syncedCount: totalCreated,
        updatedCount: totalUpdated,
        skippedCount: totalSkipped,
        failedCount: totalFailed,
        pagesProcessed,
        lastSyncedAt: syncExecutionStartTime,
        message: summaryMessage,
      };
    } catch (error) {
      this.logger.error(
        'Error during Cliniko full patient sync:',
        error.stack || error.message,
      );
      return {
        success: false,
        totalPatientsInCliniko: totalEntries,
        totalProcessed,
        syncedCount: totalCreated,
        updatedCount: totalUpdated,
        skippedCount: totalSkipped,
        failedCount: totalFailed,
        pagesProcessed,
        message: error.message || 'Unknown error occurred during patient sync.',
      };
    } finally {
      // Release Redis distributed lock safely
      try {
        const currentLockToken = await this.redis.get(
          this.PATIENTS_SYNC_LOCK_KEY,
        );
        if (currentLockToken === lockToken) {
          await this.redis.del(this.PATIENTS_SYNC_LOCK_KEY);
        }
      } catch (lockReleaseErr) {
        this.logger.error(
          'Failed to release Redis patient sync lock:',
          lockReleaseErr,
        );
      }
    }
  }

  /**
   * Processes a list of Cliniko patients in batch:
   * - Filters out invalid patients (no email, archived/deleted)
   * - Batch queries existing Users in DB by cliniko_patient_id or email
   * - Links existing users by email if not yet linked
   * - Creates new user accounts with DOB or default password
   * - Hashes passwords with bcrypt
   * - Queues welcome credentials email (if sendWelcomeEmail is not false)
   * - Updates Redis cache to mark patient as synced
   */
  async processPatients(
    patients: ClinikoPatient[],
    options?: { sendWelcomeEmail?: boolean },
  ): Promise<{
    createdCount: number;
    updatedCount: number;
    skippedCount: number;
    failedCount: number;
  }> {
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    const sendWelcomeEmail = options?.sendWelcomeEmail !== false;

    // Filter valid patients with email
    const validPatients: ClinikoPatient[] = [];
    for (const p of patients) {
      if (p.archived_at || p.deleted_at) {
        this.logger.debug(
          `Skipping archived/deleted Cliniko patient ID ${p.id} (${p.first_name || ''} ${p.last_name || ''}).`,
        );
        skippedCount++;
        continue;
      }
      if (!p.email || !p.email.trim()) {
        this.logger.warn(
          `Patient Cliniko ID ${p.id} (${p.first_name || ''} ${p.last_name || ''}) has no email. Skipping user creation.`,
        );
        skippedCount++;
        continue;
      }
      validPatients.push(p);
    }

    if (validPatients.length === 0) {
      return { createdCount, updatedCount, skippedCount, failedCount };
    }

    // Query DB for existing users
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
        phone_number: true,
        date_of_birth: true,
        gender: true,
        address: true,
        city: true,
        state: true,
        zip_code: true,
        country: true,
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

    for (const patient of validPatients) {
      const patientIdStr = String(patient.id);
      const emailLower = patient.email!.toLowerCase().trim();

      try {
        const userByCliniko = userByClinikoId.get(patientIdStr);
        const userByEmailMatch = userByEmail.get(emailLower);

        if (userByCliniko) {
          // Already linked with this Cliniko ID
          skippedCount++;
          await this.cacheSyncedPatient(patientIdStr);
          continue;
        }

        const address =
          [patient.address_1, patient.address_2].filter(Boolean).join(', ') ||
          null;
        const city = patient.city || null;
        const state = patient.state || null;
        const zipCode = patient.post_code || null;
        const country = patient.country || null;
        const phoneNumber =
          patient.patient_phone_numbers?.[0]?.number || null;

        if (userByEmailMatch) {
          if (
            userByEmailMatch.cliniko_patient_id &&
            userByEmailMatch.cliniko_patient_id !== patientIdStr
          ) {
            this.logger.warn(
              `User with email ${emailLower} is already linked to Cliniko patient ${userByEmailMatch.cliniko_patient_id}. Skipping Cliniko patient ${patientIdStr}.`,
            );
            skippedCount++;
            continue;
          }

          // User exists by email, link Cliniko Patient ID and backfill missing fields
          const updatedUser = await this.prisma.user.update({
            where: { id: userByEmailMatch.id },
            data: {
              cliniko_patient_id: patientIdStr,
              first_name: userByEmailMatch.first_name ?? patient.first_name,
              last_name: userByEmailMatch.last_name ?? patient.last_name,
              phone_number:
                userByEmailMatch.phone_number ?? phoneNumber ?? undefined,
              date_of_birth:
                userByEmailMatch.date_of_birth ??
                (patient.date_of_birth
                  ? new Date(patient.date_of_birth)
                  : undefined),
              gender:
                userByEmailMatch.gender ??
                (patient.gender_identity || patient.sex || undefined),
              address: userByEmailMatch.address ?? address ?? undefined,
              city: userByEmailMatch.city ?? city ?? undefined,
              state: userByEmailMatch.state ?? state ?? undefined,
              zip_code: userByEmailMatch.zip_code ?? zipCode ?? undefined,
              country: userByEmailMatch.country ?? country ?? undefined,
            },
          });

          userByClinikoId.set(patientIdStr, updatedUser as any);
          userByEmail.set(emailLower, updatedUser as any);
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

        const fullName =
          `${patient.first_name || ''} ${patient.last_name || ''}`.trim() ||
          'Patient';

        const newUser = await this.prisma.user.create({
          data: {
            name: fullName,
            first_name: patient.first_name || null,
            last_name: patient.last_name || null,
            email: emailLower,
            phone_number: phoneNumber,
            date_of_birth: patient.date_of_birth
              ? new Date(patient.date_of_birth)
              : null,
            gender: patient.gender_identity || patient.sex || null,
            address,
            city,
            state,
            zip_code: zipCode,
            country,
            cliniko_patient_id: patientIdStr,
            password: hashedPassword,
            type: Role.USER,
            status: 1, // Active account
            email_verified_at: new Date(), // Email verified so user can log in immediately
          },
        });

        userByClinikoId.set(patientIdStr, newUser as any);
        userByEmail.set(emailLower, newUser as any);
        createdCount++;
        await this.cacheSyncedPatient(patientIdStr);
        this.logger.log(
          `Created new user ${emailLower} (ID: ${newUser.id}) from Cliniko patient ${patientIdStr}.`,
        );

        if (sendWelcomeEmail && newUser.email) {
          try {
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
          } catch (mailErr) {
            this.logger.warn(
              `Failed to send welcome email to ${newUser.email}: ${mailErr.message}`,
            );
          }
        }
      } catch (err) {
        failedCount++;
        this.logger.error(
          `Error syncing Cliniko patient ${patientIdStr} (${emailLower}): ${err.message}`,
          err.stack,
        );
      }
    }

    return { createdCount, updatedCount, skippedCount, failedCount };
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
   * Helper: Executes an Axios request with retry logic for HTTP 429 (Rate Limit).
   * Reads Cliniko's X-RateLimit-Reset header (UNIX epoch seconds) to calculate backoff.
   */
  private async fetchWithRetry<T>(
    requestFn: () => Promise<AxiosResponse<T>>,
    maxRetries = 3,
  ): Promise<AxiosResponse<T>> {
    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        return await requestFn();
      } catch (error: any) {
        attempt++;
        if (error?.response?.status === 429 && attempt < maxRetries) {
          const resetHeader = error.response.headers?.['x-ratelimit-reset'];
          let waitMs = 2000;
          if (resetHeader) {
            const resetTimestamp = parseInt(resetHeader, 10);
            if (!isNaN(resetTimestamp)) {
              const nowSeconds = Math.floor(Date.now() / 1000);
              waitMs = Math.max((resetTimestamp - nowSeconds) * 1000, 1000);
            }
          }
          this.logger.warn(
            `Cliniko rate limit hit (429). Retrying after ${Math.ceil(waitMs / 1000)}s (attempt ${attempt}/${maxRetries})...`,
          );
          await this.sleep(waitMs);
          continue;
        }
        throw error;
      }
    }
    throw new Error(`Exceeded max retries (${maxRetries})`);
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
          const res = await this.fetchWithRetry(() =>
            client.get<ClinikoPatient>(`/patients/${id}`),
          );
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

  /**
   * Helper: Delay execution for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
