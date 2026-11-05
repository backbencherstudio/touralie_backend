import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreatePractitionerDto, CreateUserDto } from './dto/create-user.dto';
import { UpdateUserByAdminDto } from './dto/update-user.dto';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserRepository } from '../../../common/repository/user/user.repository';
import appConfig from '../../../config/app.config';
import { SojebStorage } from '../../../common/lib/Disk/SojebStorage';
import { DateHelper } from '../../../common/helper/date.helper';
import { QueryUserDto, UserStatus, UserType } from './dto/query-user.dto';
import { Prisma } from 'prisma/generated/client';

import { ActivityRepository } from 'src/common/repository/activity/activity.repository';
import { ADMIN_ACCESS_ROLES, Role } from 'src/common/guard/role/role.enum';
import { MailService } from 'src/mail/mail.service';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private userRepository: UserRepository,
    private activityRepository: ActivityRepository,
    private mailService: MailService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    try {
      const user = await this.userRepository.createUser(createUserDto);

      if (user.success) {
        return {
          success: user.success,
          message: user.message,
        };
      } else {
        return {
          success: user.success,
          message: user.message,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async createPractitioner(createPractitionerDto: CreatePractitionerDto) {
    const user = await this.userRepository.createUser({
      ...createPractitionerDto,
      type: Role.PRACTITIONER,
      status: 1,
      approved_at: DateHelper.now(),
    });

    if (user.success) {
      await this.mailService.sendPractitionerCredentials({
        name: createPractitionerDto.name,
        email: createPractitionerDto.email,
        password: createPractitionerDto.password,
      });
      return {
        success: true,
        message: 'Practitioner created successfully',
      };
    } else {
      return {
        success: false,
        message: user.message,
      };
    }
  }

  async findAll(query: QueryUserDto, user_id?: string) {
    const { search, status, type, page, limit, start_date, end_date, role } =
      query;
    const skip = (page - 1) * limit;

    const user = await this.prisma.user.findUnique({
      where: { id: user_id },
    });
    if (
      !user ||
      (!ADMIN_ACCESS_ROLES.includes(user.type as Role) &&
        user.type !== Role.PRACTITIONER)
    )
      throw new UnauthorizedException(
        'You are not authorized to perform this action',
      );
    const where: Prisma.UserWhereInput = {};
    if (search) {
      where['OR'] = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone_number: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status && status !== UserStatus.ALL) {
      if (status === UserStatus.PENDING) {
        where.OR = [{ status: 0 }, { email_verified_at: null }];
      } else {
        where.status = status === UserStatus.ACTIVE ? 1 : 2;
      }
    }

    if (type && type !== UserType.ALL) {
      where.gender =
        type === UserType.MALE
          ? { contains: 'male', mode: 'insensitive' }
          : { contains: 'female', mode: 'insensitive' };
    }

    if (start_date && end_date) {
      where['created_at'] = {
        gte: start_date,
        lte: end_date,
      };
    }

    if (ADMIN_ACCESS_ROLES.includes(user.type as Role)) {
      if (role && role !== 'all') {
        where.type = role;
      }
    } else {
      where.type = 'user';
    }

    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        weight: true,
        height: true,
        gender: true,
        type: true,
        status: true,
        date_of_birth: true,
        created_at: true,
      },
      orderBy: {
        created_at: 'desc',
      },
      skip,
      take: limit,
    });

    const total = await this.prisma.user.count({ where });

    return {
      success: true,
      message: 'Users fetched successfully',
      data: users.map((user) => {
        return {
          ...user,
          status:
            user.status === 1
              ? 'ACTIVE'
              : user.status === 2
                ? 'BANNED'
                : 'PENDING',
        };
      }),
      meta_data: {
        page,
        limit,
        total,
        search,
        filter: {
          status,
          type,
          start_date,
          end_date,
        },
      },
    };
  }

  async findOne(id: string, requester_id?: string) {
    // If a practitioner is making the request, restrict to type=user only
    if (requester_id) {
      const requester = await this.prisma.user.findUnique({
        where: { id: requester_id },
        select: { type: true },
      });
      if (requester?.type === 'practitioner') {
        const target = await this.prisma.user.findUnique({
          where: { id },
          select: { type: true },
        });
        if (!target || target.type !== 'user') {
          throw new ForbiddenException(
            'Practitioners can only view member (user) profiles',
          );
        }
      }
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id: id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        weight: true,
        height: true,
        gender: true,
        personalization: true,
        type: true,
        date_of_birth: true,
        avatar: true,
        status: true,
        patients: {
          select: {
            id: true,
            prescription: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // add avatar url to user
    if (user.avatar) {
      user['avatar_url'] = SojebStorage.url(
        appConfig().storageUrl.avatar + user.avatar,
      );
    }

    return {
      success: true,
      data: user,
    };
  }

  async approve(id: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: id },
      });
      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }
      await this.prisma.user.update({
        where: { id: id },
        data: { approved_at: DateHelper.now() },
      });

      await this.activityRepository.createActivity(
        'Member Approved',
        `Member "${user.name}" (${user.email}) has been approved by admin.`,
      );

      return {
        success: true,
        message: 'User approved successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async reject(id: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: id },
      });
      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }
      await this.prisma.user.update({
        where: { id: id },
        data: { approved_at: null },
      });

      await this.activityRepository.createActivity(
        'Member Rejected',
        `Member "${user.name}" (${user.email}) has been rejected by admin.`,
      );

      return {
        success: true,
        message: 'User rejected successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async banUnbanUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: id },
    });
    if (!user) {
      return {
        success: false,
        message: 'User not found',
      };
    }
    await this.prisma.user.update({
      where: { id: id },
      data: { status: user.status === 1 ? 2 : 1 },
    });

    await this.activityRepository.createActivity(
      user.status === 1 ? 'Member Banned' : 'Member Unbanned',
      `Member "${user.name}" (${user.email}) has been ${user.status === 1 ? 'banned' : 'unbanned'} by admin.`,
    );

    return {
      success: true,
      message:
        user.status === 1
          ? 'User banned successfully'
          : 'User unbanned successfully',
    };
  }

  async update(id: string, updateUserDto: UpdateUserByAdminDto) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('User not found');

    const data: Prisma.UserUpdateInput = {};
    if (updateUserDto.weight != null) data.weight = updateUserDto.weight;
    if (updateUserDto.height != null) data.height = updateUserDto.height;
    if (updateUserDto.personalization != null)
      data.personalization = updateUserDto.personalization;
    if (updateUserDto.name !== undefined) {
      const name = updateUserDto.name?.trim();
      if (!name) throw new BadRequestException('Name cannot be empty');
      data.name = name;
    }
    if (updateUserDto.email !== undefined) {
      if (!updateUserDto.email)
        throw new BadRequestException('Email cannot be empty');
      const email = updateUserDto.email.trim().toLowerCase();
      const duplicate = await this.prisma.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' }, NOT: { id } },
      });
      if (duplicate) throw new BadRequestException('Email already exists');
      data.email = email;
    }
    if (updateUserDto.gender !== undefined) data.gender = updateUserDto.gender;
    if (updateUserDto.date_of_birth !== undefined) {
      const dob =
        updateUserDto.date_of_birth === null
          ? null
          : new Date(updateUserDto.date_of_birth);
      if (dob && (Number.isNaN(dob.getTime()) || dob > new Date())) {
        throw new BadRequestException(
          'Date of birth must be a valid past date',
        );
      }
      data.date_of_birth = dob;
    }
    try {
      await this.prisma.user.update({ where: { id }, data });
    } catch (error) {
      if (error.code === 'P2002')
        throw new BadRequestException('Email already exists');
      throw error;
    }
    return { success: true, message: 'User updated successfully' };
  }

  async remove(id: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });

    const user = await this.userRepository.deleteUser(id);

    if (user.success && existingUser) {
      await this.activityRepository.createActivity(
        'Member Deleted',
        `Member "${existingUser.name}" (${existingUser.email}) has been deleted from the platform.`,
      );
    }

    return user;
  }
}
