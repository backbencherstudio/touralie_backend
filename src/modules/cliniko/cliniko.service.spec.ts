jest.mock('@nestjs/schedule', () => ({
  Cron: () => () => {},
  CronExpression: { EVERY_10_MINUTES: '*/10 * * * *' },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { ClinikoService } from './cliniko.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import { Role } from '../../common/guard/role/role.enum';

describe('ClinikoService', () => {
  let service: ClinikoService;
  let prismaService: any;
  let mailService: any;
  let redisClient: any;

  beforeEach(async () => {
    prismaService = {
      user: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ id: 'user-cuid-1', ...data }),
        ),
        update: jest.fn().mockImplementation(({ where, data }) =>
          Promise.resolve({ id: where.id, ...data }),
        ),
      },
    };

    mailService = {
      sendPatientWelcomeCredentials: jest.fn().mockResolvedValue(true),
    };

    const store = new Map<string, string>();
    redisClient = {
      get: jest
        .fn()
        .mockImplementation((key: string) =>
          Promise.resolve(store.get(key) ?? null),
        ),
      set: jest
        .fn()
        .mockImplementation((key: string, val: string) => {
          store.set(key, String(val));
          return Promise.resolve('OK');
        }),
      del: jest
        .fn()
        .mockImplementation((key: string) => {
          store.delete(key);
          return Promise.resolve(1);
        }),
      expire: jest.fn().mockResolvedValue(1),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClinikoService,
        { provide: PrismaService, useValue: prismaService },
        { provide: MailService, useValue: mailService },
        { provide: 'default_IORedisModuleConnectionToken', useValue: redisClient },
      ],
    }).compile();

    service = module.get<ClinikoService>(ClinikoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processPatients', () => {
    it('should skip patients without email or who are archived', async () => {
      const result = await service.processPatients([
        { id: 1, first_name: 'No', last_name: 'Email' },
        { id: 2, first_name: 'Archived', last_name: 'User', email: 'arc@test.com', archived_at: '2023-01-01' },
      ]);

      expect(result.createdCount).toBe(0);
      expect(result.skippedCount).toBe(2);
      expect(prismaService.user.create).not.toHaveBeenCalled();
    });

    it('should create new patient user account with DOB password and active status', async () => {
      const patients = [
        {
          id: 12345,
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.doe@example.com',
          date_of_birth: '1990-05-15',
          gender_identity: 'Male',
          patient_phone_numbers: [{ number: '0412345678' }],
          address_1: '123 Main St',
          city: 'Sydney',
          state: 'NSW',
          post_code: '2000',
          country: 'Australia',
        },
      ];

      const result = await service.processPatients(patients, { sendWelcomeEmail: true });

      expect(result.createdCount).toBe(1);
      expect(result.updatedCount).toBe(0);
      expect(result.skippedCount).toBe(0);
      expect(prismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'john.doe@example.com',
            first_name: 'John',
            last_name: 'Doe',
            cliniko_patient_id: '12345',
            type: Role.USER,
            status: 1,
            city: 'Sydney',
            state: 'NSW',
            zip_code: '2000',
            country: 'Australia',
          }),
        }),
      );
      expect(mailService.sendPatientWelcomeCredentials).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'john.doe@example.com',
          password: '1990-05-15',
          isDobPassword: true,
        }),
      );
      expect(redisClient.set).toHaveBeenCalledWith(
        'cliniko:patient:synced:12345',
        '1',
        'EX',
        86400,
      );
    });

    it('should link existing user by email if not yet linked', async () => {
      prismaService.user.findMany.mockResolvedValue([
        {
          id: 'existing-id-1',
          email: 'jane@example.com',
          cliniko_patient_id: null,
          first_name: 'Jane',
          last_name: 'Smith',
        },
      ]);

      const patients = [
        {
          id: 99999,
          first_name: 'Jane',
          last_name: 'Smith',
          email: 'jane@example.com',
        },
      ];

      const result = await service.processPatients(patients);

      expect(result.updatedCount).toBe(1);
      expect(result.createdCount).toBe(0);
      expect(prismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'existing-id-1' },
          data: expect.objectContaining({
            cliniko_patient_id: '99999',
          }),
        }),
      );
    });

    it('should skip if user is already linked with the same Cliniko patient ID', async () => {
      prismaService.user.findMany.mockResolvedValue([
        {
          id: 'existing-id-1',
          email: 'jane@example.com',
          cliniko_patient_id: '99999',
        },
      ]);

      const patients = [
        {
          id: 99999,
          first_name: 'Jane',
          last_name: 'Smith',
          email: 'jane@example.com',
        },
      ];

      const result = await service.processPatients(patients);

      expect(result.skippedCount).toBe(1);
      expect(result.createdCount).toBe(0);
      expect(result.updatedCount).toBe(0);
      expect(prismaService.user.create).not.toHaveBeenCalled();
      expect(prismaService.user.update).not.toHaveBeenCalled();
    });
  });

  describe('syncAllPatients', () => {
    it('should return error if lock is held by another instance', async () => {
      redisClient.set.mockResolvedValueOnce(null); // lock not acquired

      // Mock getApiClient to return a fake client so we test lock check
      jest.spyOn(service as any, 'getApiClient').mockReturnValue({
        client: { get: jest.fn() },
        baseUrl: 'https://api.au1.cliniko.com/v1',
      });

      const result = await service.syncAllPatients();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Patient sync lock held by another instance');
    });

    it('should paginate and process Cliniko patients successfully', async () => {
      const mockGet = jest
        .fn()
        .mockResolvedValueOnce({
          data: {
            patients: [
              {
                id: 101,
                first_name: 'Patient',
                last_name: 'One',
                email: 'patient1@example.com',
              },
            ],
            total_entries: 2,
            links: { next: 'https://api.au1.cliniko.com/v1/patients?page=2' },
          },
        })
        .mockResolvedValueOnce({
          data: {
            patients: [
              {
                id: 102,
                first_name: 'Patient',
                last_name: 'Two',
                email: 'patient2@example.com',
              },
            ],
            total_entries: 2,
            links: { next: null },
          },
        });

      jest.spyOn(service as any, 'getApiClient').mockReturnValue({
        client: { get: mockGet },
        baseUrl: 'https://api.au1.cliniko.com/v1',
      });

      // Avoid long sleep during tests
      jest.spyOn(service as any, 'sleep').mockResolvedValue(undefined);

      const result = await service.syncAllPatients({ perPage: 1 });

      expect(result.success).toBe(true);
      expect(result.totalProcessed).toBe(2);
      expect(result.pagesProcessed).toBe(2);
      expect(result.syncedCount).toBe(2);
      expect(redisClient.set).toHaveBeenCalledWith(
        'cliniko:patients:last_synced_at',
        expect.any(String),
      );
      expect(redisClient.del).toHaveBeenCalledWith('cliniko:patients_sync:lock');
    });
  });
});
