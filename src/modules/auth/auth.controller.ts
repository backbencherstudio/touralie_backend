import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiExcludeEndpoint,
  ApiOperation,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { memoryStorage } from 'multer';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import {
  RegisterUserDto,
  ForgotPasswordDto,
  LoginDto,
} from './dto/create-user.dto';
import {
  ResendVerificationEmailDto,
  VerifyEmailDto,
} from './dto/verify-email.dto';
import {
  ChangePasswordDto,
  ResetPasswordDto,
  UpdateUserDto,
} from './dto/update-user.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Auth')
@ApiBearerAuth('admin_token')
@ApiBearerAuth('user_token')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @ApiOperation({
    summary: 'Get current user details',
    description: `
Retrieves the profile information of the currently authenticated user.
The request must include a valid Bearer Token (JWT) in the Authorization header.

**Available Roles:**
- user
- admin

**Response Data includes:**
- ID, name, email
- Profile details (avatar, address, phone)
- Account details (type, gender, DOB)
`,
  })
  @ApiResponse({
    status: 200,
    description: 'Current user profile retrieved successfully.',
    schema: {
      example: {
        success: true,
        message: 'User details fetched successfully',
        data: {
          id: 'cmm632yhc0003kg9wfbdqce74',
          name: 'John Doe',
          email: 'john@example.com',
          avatar: 'https://example.com/avatar.jpg',
          address: '123 Main St, New York, NY',
          phone_number: '+1 234 567 8900',
          type: 'user',
          gender: 'male',
          date_of_birth: '1998-05-20T00:00:00.000Z',
          created_at: '2026-03-16T10:00:00.000Z',
        },
      },
    },
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: Request) {
    const user_id = req.user.userId;

    const response = await this.authService.me(user_id);

    return response;
  }

  @ApiOperation({
    summary: 'Register a new user account',
    description: `
Creates a new user account in the system. Upon successful registration, a verification code (OTP) is sent to the provided email address.

**Registration Flow:**
1. Submit this form with required details.
2. Receive OTP in email.
3. Verify email using the \`/auth/verify-email\` endpoint.

**Required fields:**
- **name**: Full name
- **email**: Unique email address
- **password**: Minimum 8 characters

**Optional fields:**
- **weight**, **height**, **gender**, **date_of_birth**
- **personalization**: Array of strings (e.g., goals)
`,
  })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully. Verification email sent.',
    schema: {
      example: {
        success: true,
        message: 'User registered successfully',
        data: {
          success: true,
          message: 'We have sent an OTP code to your email',
        },
      },
    },
  })
  @Post('register')
  async create(@Body() data: RegisterUserDto) {
    const name = data.name;
    const first_name = data.first_name;
    const last_name = data.last_name;
    const email = data.email;
    const password = data.password;
    const type = data.type;
    const weight = data.weight;
    const height = data.height;
    const gender = data.gender;
    const date_of_birth = data.date_of_birth;
    const personalization = data.personalization;

    if (!name) {
      throw new HttpException('Name not provided', HttpStatus.UNAUTHORIZED);
    }
    // if (!first_name) {
    //   throw new HttpException(
    //     'First name not provided',
    //     HttpStatus.UNAUTHORIZED,
    //   );
    // }
    // if (!last_name) {
    //   throw new HttpException(
    //     'Last name not provided',
    //     HttpStatus.UNAUTHORIZED,
    //   );
    // }
    if (!email) {
      throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
    }
    if (!password) {
      throw new HttpException('Password not provided', HttpStatus.UNAUTHORIZED);
    }

    const response = await this.authService.register({
      name: name,
      first_name: first_name,
      last_name: last_name,
      email: email,
      password: password,
      weight: weight,
      height: height,
      gender: gender,
      date_of_birth: date_of_birth,
      personalization: personalization,
      type: type,
    });

    return response;
  }

  // login user
  @ApiOperation({
    summary: 'User Login (Email & Password)',
    description: `
Authenticates a user and returns access and refresh tokens.

**Authentication:**
- Uses Local Strategy (email/password).
- On success, returns a JWT \`access_token\` and a \`refresh_token\`.
- The \`refresh_token\` is also set in a secure, httpOnly cookie.

**Token Usage:**
- Use \`access_token\` in the Authorization header as \`Bearer <token>\` for protected routes.
`,
  })
  @ApiBody({
    description: 'Login credentials',
    type: LoginDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful. Tokens generated.',
    schema: {
      example: {
        success: true,
        message: 'Logged in successfully',
        authorization: {
          type: 'bearer',
          access_token: 'eyJhbGciOiJIUzI1Ni...',
          refresh_token: 'def456...',
        },
        type: 'user',
      },
    },
  })
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Req() req: Request, @Res() res: Response) {
    const user_id = req.user.id;

    const user_email = req.user.email;

    const response = await this.authService.login({
      userId: user_id,
      email: user_email,
    });

    // store to secure cookies
    res.cookie('refresh_token', response.authorization.refresh_token, {
      httpOnly: true,
      secure: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    });

    res.json(response);
  }

  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Refresh token' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('refresh-token')
  async refreshToken(
    @Req() req: Request,
    @Body() body: { refresh_token: string },
  ) {
    try {
      const user_id = req.user.userId;

      const response = await this.authService.refreshToken(
        user_id,
        body.refresh_token,
      );

      return response;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
  @ApiExcludeEndpoint()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() req: Request) {
    try {
      const userId = req.user.userId;
      const response = await this.authService.revokeRefreshToken(userId);
      return response;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiExcludeEndpoint()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleLogin(): Promise<any> {
    return HttpStatus.OK;
  }
  @ApiExcludeEndpoint()
  @Get('google/redirect')
  @UseGuards(AuthGuard('google'))
  async googleLoginRedirect(@Req() req: Request): Promise<any> {
    return {
      statusCode: HttpStatus.OK,
      data: req.user,
    };
  }

  // update user
  @ApiOperation({
    summary: 'Update User Profile',
    description:
      'Provide only the fields you wish to update. Any fields left empty or omitted will remain unchanged in the system.',
  })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    schema: {
      example: {
        success: true,
        message: 'User updated successfully',
      },
    },
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('update')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
    }),
  )
  async updateUser(
    @Req() req: Request,
    @Body() data: UpdateUserDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 10 }), // 10MB
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg|webp)' }),
        ],
        fileIsRequired: false,
      }),
    )
    image: Express.Multer.File,
  ) {
    const user_id = req.user.userId;
    const response = await this.authService.updateUser(user_id, data, image);
    return response;
  }

  // --------------change password---------

  @ApiOperation({
    summary: 'Forgot password',
    description: `
Forgot password.

Required fields:
- email
`,
  })
  @ApiResponse({
    status: 200,
    description: 'Forgot password successfully',
    schema: {
      example: {
        success: true,
        message: 'We have sent an OTP code to your email',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Email not found',
    schema: {
      example: {
        success: false,
        message: 'Email not found',
      },
    },
  })
  @Post('forgot-password')
  async forgotPassword(@Body() data: ForgotPasswordDto) {
    const email = data.email;
    if (!email) {
      throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
    }
    return await this.authService.forgotPassword(email);
  }

  // verify email to verify the email
  @ApiOperation({
    summary: 'Verify email',
    description: `
Verify email.

Required fields:
- email
- token
`,
  })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully',
    schema: {
      example: {
        success: true,
        message: 'Email verified successfully',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid token',
    schema: {
      example: {
        success: false,
        message: 'Invalid token',
      },
    },
  })
  @Post('verify-email')
  async verifyEmail(@Body() data: VerifyEmailDto) {
    const email = data.email;
    const token = data.token;
    if (!email) {
      throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
    }
    if (!token) {
      throw new HttpException('Token not provided', HttpStatus.UNAUTHORIZED);
    }
    return await this.authService.verifyEmail({
      email: email,
      token: token,
    });
  }

  // resend verification email to verify the email
  @ApiOperation({
    summary: 'Resend verification email',
    description: `
Resend verification email.

Required fields:
- email
`,
  })
  @ApiResponse({
    status: 200,
    description: 'Verification email sent successfully',
    schema: {
      example: {
        success: true,
        message: 'We have sent a verification code to your email',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Email not found',
    schema: {
      example: {
        success: false,
        message: 'Email not found',
      },
    },
  })
  @Post('resend-verification-email')
  async resendVerificationEmail(@Body() data: ResendVerificationEmailDto) {
    const email = data.email;
    if (!email) {
      throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
    }
    return await this.authService.resendVerificationEmail(email);
  }

  // reset password if user forget the password
  @ApiOperation({
    summary: 'Reset password',
    description: `
Reset password.

Required fields:
- email
- token
- password
`,
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
    schema: {
      example: {
        success: true,
        message: 'Password reset successfully',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Email not found',
    schema: {
      example: {
        success: false,
        message: 'Email not found',
      },
    },
  })
  @Post('reset-password')
  async resetPassword(@Body() data: ResetPasswordDto) {
    const email = data.email;
    const token = data.token;
    const password = data.password;
    if (!email) {
      throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
    }
    if (!token) {
      throw new HttpException('Token not provided', HttpStatus.UNAUTHORIZED);
    }
    if (!password) {
      throw new HttpException('Password not provided', HttpStatus.UNAUTHORIZED);
    }
    return await this.authService.resetPassword({
      email: email,
      token: token,
      password: password,
    });
  }

  // change password if user want to change the password
  @ApiOperation({
    summary: 'Change password',
    description: `
Change password.

Required fields:
- old_password
- new_password
`,
  })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
    schema: {
      example: {
        success: true,
        message: 'Password updated successfully',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid password',
    schema: {
      example: {
        success: false,
        message: 'Invalid password',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    schema: {
      example: {
        success: false,
        message: 'User not found',
      },
    },
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(@Req() req: Request, @Body() data: ChangePasswordDto) {
    // const email = data.email;
    const user_id = req.user.userId;

    const oldPassword = data.old_password;
    const newPassword = data.new_password;
    // if (!email) {
    //   throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
    // }
    if (!oldPassword) {
      throw new BadRequestException('Old password not provided');
    }
    if (!newPassword) {
      throw new BadRequestException('New password not provided');
    }
    return await this.authService.changePassword({
      // email: email,
      user_id: user_id,
      oldPassword: oldPassword,
      newPassword: newPassword,
    });
  }

  // --------------end change password---------

  // -------change email address------
  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'request email change' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('request-email-change')
  async requestEmailChange(
    @Req() req: Request,
    @Body() data: { email: string },
  ) {
    try {
      const user_id = req.user.userId;
      const email = data.email;
      if (!email) {
        throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
      }
      return await this.authService.requestEmailChange(user_id, email);
    } catch (error) {
      return {
        success: false,
        message: 'Something went wrong',
      };
    }
  }

  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Change email address' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('change-email')
  async changeEmail(
    @Req() req: Request,
    @Body() data: { email: string; token: string },
  ) {
    try {
      const user_id = req.user.userId;
      const email = data.email;

      const token = data.token;
      if (!email) {
        throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
      }
      if (!token) {
        throw new HttpException('Token not provided', HttpStatus.UNAUTHORIZED);
      }
      return await this.authService.changeEmail({
        user_id: user_id,
        new_email: email,
        token: token,
      });
    } catch (error) {
      return {
        success: false,
        message: 'Something went wrong',
      };
    }
  }
  // -------end change email address------

  // --------- 2FA ---------
  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Generate 2FA secret' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('generate-2fa-secret')
  async generate2FASecret(@Req() req: Request) {
    try {
      const user_id = req.user.userId;
      return await this.authService.generate2FASecret(user_id);
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Verify 2FA' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('verify-2fa')
  async verify2FA(@Req() req: Request, @Body() data: { token: string }) {
    try {
      const user_id = req.user.userId;
      const token = data.token;
      return await this.authService.verify2FA(user_id, token);
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Enable 2FA' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('enable-2fa')
  async enable2FA(@Req() req: Request) {
    try {
      const user_id = req.user.userId;
      return await this.authService.enable2FA(user_id);
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Disable 2FA' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('disable-2fa')
  async disable2FA(@Req() req: Request) {
    try {
      const user_id = req.user.userId;
      return await this.authService.disable2FA(user_id);
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
  // --------- end 2FA ---------
}
