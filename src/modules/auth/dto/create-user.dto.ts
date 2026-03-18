import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsEmail,
  IsEmpty,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

export enum UserType {
  USER = 'user',
  ADMIN = 'admin',
}

export class RegisterUserDto {
  @IsNotEmpty()
  @ApiProperty({
    example: 'John Doe',
    description: 'Full name of the user. This will be used as the display name.',
  })
  name: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    example: 'John',
    description: 'First name of the user (Optional)',
    required: false,
  })
  first_name?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    example: 'Doe',
    description: 'Last name of the user (Optional)',
    required: false,
  })
  last_name?: string;

  @IsNotEmpty()
  @IsEmail()
  @ApiProperty({
    example: 'john@example.com',
    description: 'Unique email address of the user, used for login and verification.',
  })
  email: string;

  @IsNotEmpty()
  @MinLength(8, { message: 'Password should be minimum 8 characters' })
  @IsString()
  @ApiProperty({
    example: 'password123',
    description: 'Password for the user account. Must be at least 8 characters long.',
  })
  password: string;

  @IsOptional()
  @IsNumber()
  @ApiProperty({
    example: 70,
    description: 'Weight of the user in kilograms (kg) (Optional)',
    required: false,
  })
  weight?: number;

  @IsOptional()
  @IsNumber()
  @ApiProperty({
    example: 175,
    description: 'Height of the user in centimeters (cm) (Optional)',
    required: false,
  })
  height?: number;

  @IsOptional()
  @IsString()
  @ApiProperty({
    enum: Gender,
    example: Gender.MALE,
    description: 'Gender of the user. Can be male, female, or other. (Optional)',
    required: false,
  })
  gender?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  @ApiProperty({
    example: '1998-05-20T00:00:00.000Z',
    description: 'Date of birth of the user in ISO 8601 format. (Optional)',
    required: false,
  })
  date_of_birth?: Date;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ApiProperty({
    example: ['strength', 'fat_loss', 'mobility'],
    description:
      'Personalization preferences or fitness goals. Provide an array of strings. (Optional)',
    required: false,
    type: [String],
  })
  personalization?: string[];

  @IsOptional()
  @IsString()
  @ApiProperty({
    enum: UserType,
    example: UserType.USER,
    description: 'Type of the user. Defaults to user. (Optional)',
    required: false,
    default: UserType.USER,
  })
  type?: string = 'user';
}

export class LoginDto {
  @IsNotEmpty()
  @IsEmail()
  @ApiProperty({
    example: 'admin@example.com',
    description: 'Email address of the user',
  })
  email: string;

  @IsNotEmpty()
  @MinLength(8, { message: 'Password should be minimum 8 characters' })
  @IsString()
  @ApiProperty({
    example: '12345678',
    description: 'Password for the user account',
  })
  password: string;
}
export class ForgotPasswordDto {
  @IsNotEmpty()
  @IsEmail()
  @ApiProperty({
    example: 'john@example.com',
    description: 'Email address of the user',
  })
  email: string;
}
