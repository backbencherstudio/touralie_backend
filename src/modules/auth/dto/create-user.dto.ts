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

export class RegisterUserDto {
  @IsNotEmpty()
  @ApiProperty({ example: 'John Doe', description: 'Full name of the user' })
  name: string;

  @IsOptional()
  @IsString()
  // @ApiProperty({
  //   example: 'John',
  //   description: 'First name of the user',
  //   required: false,
  // })
  first_name?: string;

  @IsOptional()
  @IsString()
  // @ApiProperty({
  //   example: 'Doe',
  //   description: 'Last name of the user',
  //   required: false,
  // })
  last_name?: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    example: 'john@example.com',
    description: 'Email address of the user',
  })
  email: string;

  @IsNotEmpty()
  @MinLength(8, { message: 'Password should be minimum 8 characters' })
  @IsString()
  @ApiProperty({
    example: 'password123',
    description: 'Password for the user account',
  })
  password: string;

  @IsOptional()
  @IsNumber()
  @ApiProperty({
    example: 70,
    description: 'Weight of the user in kilograms',
    required: false,
  })
  weight?: number;

  @IsOptional()
  @IsNumber()
  @ApiProperty({
    example: 175,
    description: 'Height of the user in centimeters',
    required: false,
  })
  height?: number;

  @IsOptional()
  @IsString()
  @ApiProperty({
    example: 'male',
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
    description:
      'Personalization preferences for the user (e.g., fitness goals)',
    required: false,
    type: [String],
  })
  personalization?: string[];

  @IsEmpty()
  @IsString()
  // @ApiProperty({
  //   example: 'user',
  //   description: 'Type of the user (e.g., user, admin)',
  //   required: false,
  // })
  type?: string;
}

export class LoginDto {
  @IsNotEmpty()
  @IsEmail()
  @ApiProperty({
    example: 'john@example.com',
    description: 'Email address of the user',
  })
  email: string;

  @IsNotEmpty()
  @MinLength(8, { message: 'Password should be minimum 8 characters' })
  @IsString()
  @ApiProperty({
    example: 'password123',
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
