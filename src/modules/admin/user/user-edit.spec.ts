import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserByAdminDto } from './dto/update-user.dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

describe('Admin member editing', () => {
  const prisma = {
    user: { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
  };
  const service = Object.assign(Object.create(UserService.prototype), {
    prisma,
  }) as UserService;

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.user.findUnique.mockResolvedValue({
      id: 'member',
      password: 'unchanged',
    });
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.update.mockResolvedValue({ id: 'member' });
  });

  it('accepts a date string and rejects an invalid date', async () => {
    expect(
      await validate(
        plainToInstance(UpdateUserByAdminDto, { date_of_birth: '1990-05-15' }),
      ),
    ).toHaveLength(0);
    expect(
      (
        await validate(
          plainToInstance(UpdateUserByAdminDto, {
            date_of_birth: '1990-02-31',
          }),
        )
      ).length,
    ).toBeGreaterThan(0);
  });

  it('updates DOB and unchanged email without changing password or role', async () => {
    await service.update('member', {
      email: 'Patient@example.com',
      date_of_birth: '1990-05-15',
    });
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        email: { equals: 'patient@example.com', mode: 'insensitive' },
        NOT: { id: 'member' },
      },
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'member' },
      data: {
        email: 'patient@example.com',
        date_of_birth: new Date('1990-05-15'),
      },
    });
  });

  it('allows clearing DOB and gender', async () => {
    await service.update('member', { date_of_birth: null, gender: null });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'member' },
      data: { date_of_birth: null, gender: null },
    });
  });

  it('rejects duplicate email without writing', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'another' });
    await expect(
      service.update('member', { email: 'used@example.com' }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('rejects a missing member and future DOB', async () => {
    await expect(
      service.update('member', { date_of_birth: '2999-01-01' }),
    ).rejects.toThrow(BadRequestException);
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.update('missing', { name: 'Name' })).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
