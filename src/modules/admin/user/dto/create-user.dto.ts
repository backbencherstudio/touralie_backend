import { ApiProperty } from '@nestjs/swagger';
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

export class CreateUserDto {
  @IsNotEmpty()
  @ApiProperty({
    example: 'John Doe',
    description: 'Full name of the user',
  })
  name: string;

  @IsNotEmpty()
  @IsEmail()
  @ApiProperty({
    example: 'john@example.com',
    description: 'Unique email address of the user',
  })
  email: string;

  @IsNotEmpty()
  @MinLength(8, { message: 'Password should be minimum 8 characters' })
  @IsString()
  @ApiProperty({
    example: 'password123',
    description: 'Password for the user account (Min 8 characters)',
  })
  password: string;

  @IsOptional()
  @IsNumber()
  @ApiProperty({
    example: 70,
    description: 'Weight of the user in kilograms (kg)',
    required: false,
  })
  weight?: number;

  @IsOptional()
  @IsNumber()
  @ApiProperty({
    example: 175,
    description: 'Height of the user in centimeters (cm)',
    required: false,
  })
  height?: number;

  @IsOptional()
  @IsString()
  @ApiProperty({
    enum: Gender,
    example: Gender.MALE,
    description: 'Gender of the user',
    required: false,
  })
  gender?: string;

  @IsOptional()
  @IsDate()
  @ApiProperty({
    example: '1998-05-20T00:00:00.000Z',
    description: 'Date of birth of the user',
    required: false,
  })
  date_of_birth?: Date;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ApiProperty({
    example: ['strength', 'fat_loss', 'mobility'],
    description: 'Personalization preferences or fitness goals',
    required: false,
    type: [String],
  })
  personalization?: string[];

  @IsOptional()
  @IsString()
  @ApiProperty({
    enum: UserType,
    example: UserType.USER,
    description: 'Type of the user (user or admin)',
    required: false,
    default: UserType.USER,
  })
  type?: string = 'user';
}
