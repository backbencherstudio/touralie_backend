// external imports
import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

//internal imports
import appConfig from '../../config/app.config';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRepository } from '../../common/repository/user/user.repository';
import { UcodeRepository } from '../../common/repository/ucode/ucode.repository';
import { MailService } from '../../mail/mail.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { SojebStorage } from '../../common/lib/Disk/SojebStorage';
import { DateHelper } from '../../common/helper/date.helper';
import { StripePayment } from '../../common/lib/Payment/stripe/StripePayment';
import { StringHelper } from '../../common/helper/string.helper';
import { ActivityRepository } from '../../common/repository/activity/activity.repository';
import { NotificationRepository } from '../../common/repository/notification/notification.repository';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private mailService: MailService,
    private userRepository: UserRepository,
    private ucodeRepository: UcodeRepository,
    private activityRepository: ActivityRepository,
    private notificationRepository: NotificationRepository,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async me(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        address: true,
        phone_number: true,
        type: true,
        gender: true,
        date_of_birth: true,
        created_at: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.avatar) {
      user['avatar_url'] = SojebStorage.url(
        appConfig().storageUrl.avatar + user.avatar,
      );
    }

    if (user) {
      return {
        success: true,
        data: user,
      };
    } else {
      throw new NotFoundException('User not found');
    }
  }

  async updateUser(
    userId: string,
    updateUserDto: UpdateUserDto,
    image?: Express.Multer.File,
  ) {
    const data: any = {};
    if (updateUserDto.name) {
      data.name = updateUserDto.name;
    }
    if (updateUserDto.first_name) {
      data.first_name = updateUserDto.first_name;
    }
    if (updateUserDto.last_name) {
      data.last_name = updateUserDto.last_name;
    }
    if (updateUserDto.phone_number) {
      data.phone_number = updateUserDto.phone_number;
    }
    if (updateUserDto.country) {
      data.country = updateUserDto.country;
    }
    if (updateUserDto.state) {
      data.state = updateUserDto.state;
    }
    if (updateUserDto.local_government) {
      data.local_government = updateUserDto.local_government;
    }
    if (updateUserDto.city) {
      data.city = updateUserDto.city;
    }
    if (updateUserDto.zip_code) {
      data.zip_code = updateUserDto.zip_code;
    }
    if (updateUserDto.address) {
      data.address = updateUserDto.address;
    }
    if (updateUserDto.gender) {
      data.gender = updateUserDto.gender;
    }
    if (updateUserDto.date_of_birth) {
      data.date_of_birth = DateHelper.format(updateUserDto.date_of_birth);
    }
    if (image) {
      // delete old image from storage
      const oldImage = await this.prisma.user.findFirst({
        where: { id: userId },
        select: { avatar: true },
      });
      if (oldImage.avatar) {
        try {
          await SojebStorage.delete(
            appConfig().storageUrl.avatar + oldImage.avatar,
          );
        } catch (e) {}
      }

      // upload file
      const fileName = `${StringHelper.randomString()}${image.originalname}`;
      await SojebStorage.put(
        appConfig().storageUrl.avatar + fileName,
        image.buffer,
      );

      data.avatar = fileName;
    }
    const user = await this.userRepository.getUserDetails(userId);
    if (user) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          ...data,
        },
      });

      return {
        success: true,
        message: 'User updated successfully',
      };
    } else {
      throw new NotFoundException('User not found');
    }
  }

  async validateUser(
    email: string,
    pass: string,
    token?: string,
  ): Promise<any> {
    const _password = pass;
    const user = await this.prisma.user.findFirst({
      where: {
        email: email,
      },
    });

    if (user) {
      const _isValidPassword = await this.userRepository.validatePassword({
        email: email,
        password: _password,
      });
      if (_isValidPassword) {
        const { password, ...result } = user;
        if (user.is_two_factor_enabled) {
          if (token) {
            const isValid = await this.userRepository.verify2FA(user.id, token);
            if (!isValid) {
              throw new UnauthorizedException('Invalid token');
              // return {
              //   success: false,
              //   message: 'Invalid token',
              // };
            }
          } else {
            throw new UnauthorizedException('Token is required');
            // return {
            //   success: false,
            //   message: 'Token is required',
            // };
          }
        }
        return result;
      } else {
        throw new UnauthorizedException('Password not matched');
        // return {
        //   success: false,
        //   message: 'Password not matched',
        // };
      }
    } else {
      throw new UnauthorizedException('Email not found');
      // return {
      //   success: false,
      //   message: 'Email not found',
      // };
    }
  }

  async login({
    email,
    userId,
    fcm_token,
  }: {
    email: string;
    userId: string;
    fcm_token?: string;
  }) {
    const payload = { email: email, sub: userId };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    const user = await this.userRepository.getUserDetails(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // update fcm token if provided
    if (fcm_token) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { fcm_token: fcm_token },
      });
    }

    // store refreshToken
    await this.redis.set(
      `refresh_token:${user.id}`,
      refreshToken,
      'EX',
      60 * 60 * 24 * 7, // 7 days in seconds
    );

    return {
      success: true,
      message: 'Logged in successfully',
      authorization: {
        type: 'bearer',
        access_token: accessToken,
        refresh_token: refreshToken,
      },
      type: user.type,
    };
  }

  async refreshToken(user_id: string, refreshToken: string) {
    try {
      const storedToken = await this.redis.get(`refresh_token:${user_id}`);

      if (!storedToken || storedToken != refreshToken) {
        return {
          success: false,
          message: 'Refresh token is required',
        };
      }

      if (!user_id) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      const userDetails = await this.userRepository.getUserDetails(user_id);
      if (!userDetails) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      const payload = { email: userDetails.email, sub: userDetails.id };
      const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });

      return {
        success: true,
        authorization: {
          type: 'bearer',
          access_token: accessToken,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async revokeRefreshToken(user_id: string) {
    try {
      const storedToken = await this.redis.get(`refresh_token:${user_id}`);
      if (!storedToken) {
        return {
          success: false,
          message: 'Refresh token not found',
        };
      }

      await this.redis.del(`refresh_token:${user_id}`);

      return {
        success: true,
        message: 'Refresh token revoked successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async register({
    name,
    first_name,
    last_name,
    email,
    password,
    type,
    weight,
    height,
    gender,
    date_of_birth,
    personalization,
  }: {
    name: string;
    first_name?: string;
    last_name?: string;
    email: string;
    password: string;
    type?: string;
    weight?: number;
    height?: number;
    gender?: string;
    date_of_birth?: Date;
    personalization?: string[];
  }) {
    // Check if email already exist
    const userEmailExist = await this.userRepository.exist({
      field: 'email',
      value: String(email),
    });

    if (userEmailExist) {
      throw new UnauthorizedException('Email already exist');
    }

    const user = await this.userRepository.createUser({
      name: name,
      first_name: first_name,
      last_name: last_name,
      email: email,
      password: password,
      type: type,
      weight: weight,
      height: height,
      gender: gender,
      date_of_birth: date_of_birth,
      personalization: personalization,
    });

    if (user.success) {
      await this.activityRepository.createActivity(
        'New Member Registered',
        `A new member "${name}" (${email}) has joined the platform.`,
      );

      // Notify Admins
      const admins = await this.prisma.user.findMany({
        where: { type: 'admin' },
        select: { id: true },
      });

      for (const admin of admins) {
        await this.notificationRepository.createNotification({
          receiver_id: admin.id,
          title: 'New User Registered',
          description: `A new user ${name} (${email}) has registered on the platform.`,
          type: 'package',
        });
      }
    }

    if (user == null && user.success == false) {
      throw new InternalServerErrorException('Failed to create account');
    }

    // create stripe customer account
    // const stripeCustomer = await StripePayment.createCustomer({
    //   user_id: user.data.id,
    //   email: email,
    //   name: name,
    // });

    // if (stripeCustomer) {
    //   await this.prisma.user.update({
    //     where: {
    //       id: user.data.id,
    //     },
    //     data: {
    //       billing_id: stripeCustomer.id,
    //     },
    //   });
    // }

    // ----------------------------------------------------
    // // create otp code
    const token = await this.ucodeRepository.createToken({
      userId: user.data.id,
      isOtp: true,
    });

    // // send otp code to email
    await this.mailService.sendOtpCodeToEmail({
      email: email,
      name: name,
      otp: token,
    });

    return {
      success: true,
      message: 'We have sent an OTP code to your email',
    };

    // ----------------------------------------------------

    // Generate verification token
    // const token = await this.ucodeRepository.createVerificationToken({
    //   userId: user.data.id,
    //   email: email,
    // });

    // Send verification email with token
    // await this.mailService.sendVerificationLink({
    //   email,
    //   name: email,
    //   token: token.token,
    //   type: type,
    // });

    // return {
    //   success: true,
    //   message: 'We have sent a verification link to your email',
    // };
  }

  async forgotPassword(email) {
    const user = await this.userRepository.exist({
      field: 'email',
      value: email,
    });

    if (user) {
      const token = await this.ucodeRepository.createToken({
        userId: user.id,
        isOtp: true,
      });

      await this.mailService.sendOtpCodeToEmail({
        email: email,
        name: user.name,
        otp: token,
      });

      return {
        success: true,
        message: 'We have sent an OTP code to your email',
      };
    } else {
      throw new NotFoundException('Email not found');
    }
  }

  async resetPassword({ email, token, password }) {
    const user = await this.userRepository.exist({
      field: 'email',
      value: email,
    });

    if (user) {
      const existToken = await this.ucodeRepository.validateToken({
        email: email,
        token: token,
      });

      if (existToken) {
        await this.userRepository.changePassword({
          email: email,
          password: password,
        });

        // delete otp code
        await this.ucodeRepository.deleteToken({
          email: email,
          token: token,
        });

        return {
          success: true,
          message: 'Password updated successfully',
        };
      } else {
        throw new UnauthorizedException('Invalid token');
      }
    } else {
      throw new NotFoundException('Email not found');
    }
  }

  async verifyEmail({ email, token }) {
    const user = await this.userRepository.exist({
      field: 'email',
      value: email,
    });

    if (user) {
      const existToken = await this.ucodeRepository.validateToken({
        email: email,
        token: token,
      });

      if (existToken) {
        await this.prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            email_verified_at: new Date(Date.now()),
          },
        });

        // delete otp code
        // await this.ucodeRepository.deleteToken({
        //   email: email,
        //   token: token,
        // });
        await this.ucodeRepository.deleteAllToken({ email: email });

        return {
          success: true,
          message: 'Email verified successfully',
        };
      } else {
        throw new UnauthorizedException('Invalid token');
      }
    } else {
      throw new NotFoundException('Email not found');
    }
  }

  async checkOtp({ email, token }) {
    const user = await this.userRepository.exist({
      field: 'email',
      value: email,
    });

    if (user) {
      const existToken = await this.ucodeRepository.validateToken({
        email: email,
        token: token,
      });

      if (existToken) {
        return {
          success: true,
          message: 'OTP is valid',
        };
      } else {
        throw new UnauthorizedException('Invalid token');
      }
    } else {
      throw new NotFoundException('Email not found');
    }
  }

  async resendVerificationEmail(email: string) {
    const user = await this.userRepository.getUserByEmail(email);

    if (user) {
      // create otp code
      const token = await this.ucodeRepository.createToken({
        userId: user.id,
        isOtp: true,
      });

      // send otp code to email
      await this.mailService.sendOtpCodeToEmail({
        email: email,
        name: user.name,
        otp: token,
      });

      return {
        success: true,
        message: 'We have sent a verification code to your email',
      };
    } else {
      throw new NotFoundException('Email not found');
    }
  }

  async changePassword({ user_id, oldPassword, newPassword }) {
    const user = await this.userRepository.getUserDetails(user_id);

    if (user) {
      const _isValidPassword = await this.userRepository.validatePassword({
        email: user.email,
        password: oldPassword,
      });
      if (_isValidPassword) {
        await this.userRepository.changePassword({
          email: user.email,
          password: newPassword,
        });

        return {
          success: true,
          message: 'Password updated successfully',
        };
      } else {
        throw new UnauthorizedException('Invalid password');
      }
    } else {
      throw new NotFoundException('User not found');
    }
  }

  async requestEmailChange(user_id: string, email: string) {
    try {
      const user = await this.userRepository.getUserDetails(user_id);
      if (user) {
        const token = await this.ucodeRepository.createToken({
          userId: user.id,
          isOtp: true,
          email: email,
        });

        await this.mailService.sendOtpCodeToEmail({
          email: email,
          name: email,
          otp: token,
        });

        return {
          success: true,
          message: 'We have sent an OTP code to your email',
        };
      } else {
        return {
          success: false,
          message: 'User not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async changeEmail({
    user_id,
    new_email,
    token,
  }: {
    user_id: string;
    new_email: string;
    token: string;
  }) {
    try {
      const user = await this.userRepository.getUserDetails(user_id);

      if (user) {
        const existToken = await this.ucodeRepository.validateToken({
          email: new_email,
          token: token,
          forEmailChange: true,
        });

        if (existToken) {
          await this.userRepository.changeEmail({
            user_id: user.id,
            new_email: new_email,
          });

          // delete otp code
          await this.ucodeRepository.deleteToken({
            email: new_email,
            token: token,
          });

          return {
            success: true,
            message: 'Email updated successfully',
          };
        } else {
          return {
            success: false,
            message: 'Invalid token',
          };
        }
      } else {
        return {
          success: false,
          message: 'User not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // --------- 2FA ---------
  async generate2FASecret(user_id: string) {
    try {
      return await this.userRepository.generate2FASecret(user_id);
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async verify2FA(user_id: string, token: string) {
    try {
      const isValid = await this.userRepository.verify2FA(user_id, token);
      if (!isValid) {
        return {
          success: false,
          message: 'Invalid token',
        };
      }
      return {
        success: true,
        message: '2FA verified successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async enable2FA(user_id: string) {
    try {
      const user = await this.userRepository.getUserDetails(user_id);
      if (user) {
        await this.userRepository.enable2FA(user_id);
        return {
          success: true,
          message: '2FA enabled successfully',
        };
      } else {
        return {
          success: false,
          message: 'User not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async disable2FA(user_id: string) {
    try {
      const user = await this.userRepository.getUserDetails(user_id);
      if (user) {
        await this.userRepository.disable2FA(user_id);
        return {
          success: true,
          message: '2FA disabled successfully',
        };
      } else {
        return {
          success: false,
          message: 'User not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
  // --------- end 2FA ---------

  async deleteMyAccount(user_id: string) {
    const user = await this.userRepository.getUserDetails(user_id);
    if (user) {
      await this.userRepository.deleteUser(user_id);
      return {
        success: true,
        message: 'Account deleted successfully',
      };
    } else {
      throw new NotFoundException('User not found');
    }
  }
}
