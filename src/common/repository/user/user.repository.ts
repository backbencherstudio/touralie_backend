import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import appConfig from '../../../config/app.config';
import { ArrayHelper } from '../../helper/array.helper';
import { Role } from '../../guard/role/role.enum';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SojebStorage } from '../../lib/Disk/SojebStorage';

const CREATABLE_USER_TYPES = [Role.ADMIN, Role.USER, Role.PRACTITIONER];

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}
  /**
   * get user by email
   * @param email
   * @returns
   */
  async getUserByEmail(email: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        email: email,
      },
    });
    return user;
  }

  // email varification
  async verifyEmail({ email }) {
    const user = await this.prisma.user.findFirst({
      where: {
        email: email,
      },
    });
    return user;
  }

  /**
   * get user details
   * @returns
   */
  async getUserDetails(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
      },
      include: {
        role_users: {
          include: {
            role: {
              include: {
                permission_roles: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    return user;
  }

  /**
   * Check existance
   * @returns
   */
  async exist({ field, value }) {
    const model = await this.prisma.user.findFirst({
      where: {
        [field]: value,
      },
    });
    return model;
  }

  /**
   * Create su admin user
   * @param param0
   * @returns
   */
  async createSuAdminUser({ username, email, password }) {
    try {
      password = await bcrypt.hash(password, appConfig().security.salt);

      const user = await this.prisma.user.create({
        data: {
          username: username,
          email: email,
          password: password,
          type: Role.SU_ADMIN,
        },
      });
      return user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create or update the seeded system admin user.
   * Keeps env changes in sync when seed is run again.
   */
  async syncSuAdminUser({ username, email, password }) {
    try {
      const hashedPassword = await bcrypt.hash(
        password,
        appConfig().security.salt,
      );

      let existingUser = await this.prisma.user.findFirst({
        where: {
          type: Role.SU_ADMIN,
        },
        orderBy: {
          created_at: 'asc',
        },
      });

      if (!existingUser) {
        existingUser = await this.prisma.user.findFirst({
          where: {
            OR: [
              {
                email: email,
              },
              {
                username: username,
                type: Role.ADMIN,
              },
            ],
          },
          orderBy: {
            created_at: 'asc',
          },
        });
      }

      if (existingUser) {
        return await this.prisma.user.update({
          where: {
            id: existingUser.id,
          },
          data: {
            username: username,
            email: email,
            password: hashedPassword,
            type: Role.SU_ADMIN,
          },
        });
      }

      return await this.prisma.user.create({
        data: {
          username: username,
          email: email,
          password: hashedPassword,
          type: Role.SU_ADMIN,
        },
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Invite user under tenant
   * @param param0
   * @returns
   */
  async inviteUser({
    name,
    username,
    email,
    role_id,
  }: {
    name: string;
    username: string;
    email: string;
    role_id: string;
  }) {
    try {
      const user = await this.prisma.user.create({
        data: {
          name: name,
          username: username,
          email: email,
        },
      });
      if (user) {
        // attach role
        await this.attachRole({
          user_id: user.id,
          role_id: role_id,
        });
        return user;
      } else {
        return false;
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Attach a role to a user
   * @param param0
   * @returns
   */
  async attachRole({ user_id, role_id }: { user_id: string; role_id: string }) {
    const role = await this.prisma.roleUser.create({
      data: {
        user_id: user_id,
        role_id: role_id,
      },
    });
    return role;
  }

  /**
   * update user role
   * @param param0
   * @returns
   */
  async syncRole({ user_id, role_id }: { user_id: string; role_id: string }) {
    const role = await this.prisma.roleUser.updateMany({
      where: {
        AND: [
          {
            user_id: user_id,
          },
        ],
      },
      data: {
        role_id: role_id,
      },
    });
    return role;
  }

  /**
   * create user under a tenant
   * @param param0
   * @returns
   */
  async createUser({
    name,
    first_name,
    last_name,
    email,
    password,
    phone_number,
    weight,
    height,
    gender,
    date_of_birth,
    personalization,
    role_id = null,
    type = 'user',
    status,
    approved_at,
  }: {
    name?: string;
    first_name?: string;
    last_name?: string;
    email: string;
    password: string;
    weight?: number;
    height?: number;
    date_of_birth?: Date;
    gender?: string;
    personalization?: string[];
    phone_number?: string;
    role_id?: string;
    type?: string;
    status?: number;
    approved_at?: Date;
  }) {
    const data = {};
    if (name) {
      data['name'] = name;
    }
    if (first_name) {
      data['first_name'] = first_name;
    }
    if (last_name) {
      data['last_name'] = last_name;
    }
    if (phone_number) {
      data['phone_number'] = phone_number;
    }
    if (weight) {
      data['weight'] = weight;
    }
    if (height) {
      data['height'] = height;
    }
    if (gender) {
      data['gender'] = gender;
    }
    if (date_of_birth) {
      data['date_of_birth'] = date_of_birth;
    }
    if (personalization) {
      data['personalization'] = personalization;
    }
    if (email) {
      // Check if email already exist
      const userEmailExist = await this.exist({
        field: 'email',
        value: String(email),
      });

      if (userEmailExist) {
        return {
          success: false,
          message: 'Email already exist',
        };
      }

      data['email'] = email;
    }
    if (password) {
      data['password'] = await bcrypt.hash(password, appConfig().security.salt);
    }

    if (type && ArrayHelper.inArray(type, CREATABLE_USER_TYPES)) {
      data['type'] = type;

      // if (type == Role.VENDOR) {
      //   data['approved_at'] = DateHelper.now();
      // }
    }

    if (status) {
      data['status'] = status;
    }

    if (approved_at) {
      data['approved_at'] = approved_at;
    }

    const user = await this.prisma.user.create({
      data: {
        ...data,
      },
    });

    if (user) {
      if (role_id) {
        // attach role
        await this.attachRole({
          user_id: user.id,
          role_id: role_id,
        });
      }

      return {
        success: true,
        message: 'User created successfully',
        data: user,
      };
    } else {
      throw new Error('User creation failed');
    }
  }

  /**
   * create user under a tenant
   * @param param0
   * @returns
   */
  async updateUser(
    user_id: string,
    {
      name,
      email,
      password,
      weight,
      height,
      gender,
      date_of_birth,
      personalization,
      role_id = null,
      type = 'user',
    }: {
      name?: string;
      email?: string;
      password?: string;
      weight?: number;
      height?: number;
      gender?: string;
      date_of_birth?: Date;
      personalization?: string[];
      role_id?: string;
      type?: string;
    },
  ) {
    const data = {};
    if (name) {
      data['name'] = name;
    }
    if (email) {
      // Check if email already exist
      const userEmailExist = await this.exist({
        field: 'email',
        value: String(email),
      });

      if (userEmailExist) {
        throw new BadRequestException('Email already exist');
      }
      data['email'] = email;
    }
    if (password) {
      data['password'] = await bcrypt.hash(password, appConfig().security.salt);
    }

    if (ArrayHelper.inArray(type, CREATABLE_USER_TYPES)) {
      data['type'] = type;
    } else {
      return {
        success: false,
        message: 'Invalid user type',
      };
    }

    const existUser = await this.prisma.user.findFirst({
      where: {
        id: user_id,
      },
    });

    if (weight) {
      data['weight'] = weight;
    }
    if (height) {
      data['height'] = height;
    }
    if (gender) {
      data['gender'] = gender;
    }
    if (date_of_birth) {
      data['date_of_birth'] = date_of_birth;
    }
    if (personalization) {
      data['personalization'] = personalization;
    }

    if (!existUser) {
      throw new NotFoundException('User not found');
    }

    const user = await this.prisma.user.update({
      where: {
        id: user_id,
      },
      data: {
        ...data,
      },
    });

    if (user) {
      if (role_id) {
        // attach role
        await this.attachRole({
          user_id: user.id,
          role_id: role_id,
        });
      }

      return {
        success: true,
        message: 'User updated successfully',
        // data: user,
      };
    } else {
      throw new BadRequestException('User update failed');
    }
  }

  /**
   * delete user
   * @param param0
   * @returns
   */
  async deleteUser(user_id: string) {
    // check if user exist
    const existUser = await this.prisma.user.findFirst({
      where: {
        id: user_id,
      },
    });
    if (!existUser) {
      throw new NotFoundException('User not found');
    }

    if (existUser.email == appConfig().defaultUser.system.email) {
      throw new BadRequestException('Super Admin cannot be deleted');
    }

    await this.prisma.user.delete({
      where: {
        id: user_id,
      },
    });

    if (existUser.avatar) {
      try {
        await SojebStorage.delete(
          appConfig().storageUrl.avatar + existUser.avatar,
        );
      } catch (e) {}
    }

    return {
      success: true,
      message: 'User deleted successfully',
    };
  }

  // change password
  async changePassword({
    email,
    password,
  }: {
    email: string;
    password: string;
  }) {
    try {
      password = await bcrypt.hash(password, appConfig().security.salt);
      const user = await this.prisma.user.update({
        where: {
          email: email,
        },
        data: {
          password: password,
        },
      });
      return user;
    } catch (error) {
      throw error;
    }
  }

  // change email
  async changeEmail({
    user_id,
    new_email,
  }: {
    user_id: string;
    new_email: string;
  }) {
    try {
      const user = await this.prisma.user.update({
        where: {
          id: user_id,
        },
        data: {
          email: new_email,
        },
      });
      return user;
    } catch (error) {
      throw error;
    }
  }

  // validate password
  async validatePassword({
    email,
    password,
  }: {
    email: string;
    password: string;
  }) {
    const user = await this.prisma.user.findFirst({
      where: {
        email: email,
      },
    });
    if (user) {
      const isValid = await bcrypt.compare(password, user.password);
      return isValid;
    } else {
      return false;
    }
  }

  // convert user type to admin/vendor
  async convertTo(user_id: string, type: string = 'vendor') {
    try {
      const userDetails = await this.getUserDetails(user_id);
      if (!userDetails) {
        return {
          success: false,
          message: 'User not found',
        };
      }
      if (userDetails.type == 'vendor') {
        return {
          success: false,
          message: 'User is already a vendor',
        };
      }
      await this.prisma.user.update({
        where: { id: user_id },
        data: { type: type },
      });

      return {
        success: true,
        message: 'Converted to ' + type + ' successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // generate two factor secret
  async generate2FASecret(user_id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: user_id },
    });

    if (!user) {
      return {
        success: false,
        message: 'User not found',
      };
    }

    const secret = speakeasy.generateSecret();
    await this.prisma.user.update({
      where: { id: user_id },
      data: { two_factor_secret: secret.base32 },
    });

    const otpAuthUrl = secret.otpauth_url;

    const qrCode = await QRCode.toDataURL(otpAuthUrl);

    return {
      success: true,
      message: '2FA secret generated successfully',
      data: {
        secret: secret.base32,
        qrCode: qrCode,
      },
    };
  }

  // verify two factor
  async verify2FA(user_id: string, token: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: user_id } });

    if (!user || !user.two_factor_secret) return false;

    const isValid = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: 'base32',
      token,
    });

    return isValid;
  }

  // enable two factor
  async enable2FA(user_id: string) {
    const user = await this.prisma.user.update({
      where: { id: user_id },
      data: { is_two_factor_enabled: 1 },
    });
    return user;
  }

  // disable two factor
  async disable2FA(user_id: string) {
    const user = await this.prisma.user.update({
      where: { id: user_id },
      data: { is_two_factor_enabled: 0, two_factor_secret: null },
    });
    return user;
  }
}
