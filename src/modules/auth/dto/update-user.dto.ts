import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { RegisterUserDto } from './create-user.dto';
import {
  IsDate,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateUserDto extends PartialType(
  OmitType(RegisterUserDto, ['email', 'password'] as const),
) {
  // @IsOptional()
  // @ApiProperty({
  //   description: 'Country',
  //   example: 'Nigeria',
  // })
  country?: string;

  // @IsOptional()
  // @ApiProperty({
  //   description: 'State',
  //   example: 'Lagos',
  // })
  state?: string;

  // @IsOptional()
  // @ApiProperty({
  //   description: 'City',
  //   example: 'Lagos',
  // })
  city?: string;

  // @IsOptional()
  // @ApiProperty({
  //   description: 'Local government',
  //   example: 'Lagos',
  // })
  local_government?: string;

  // @IsOptional()
  // @ApiProperty({
  //   description: 'Zip code',
  //   example: '123456',
  // })
  zip_code?: string;

  // @IsOptional()
  // @ApiProperty({
  //   description: 'Phone number',
  //   example: '+91 9876543210',
  // })
  phone_number?: string;

  // @IsOptional()
  // @ApiProperty({
  //   description: 'Address',
  //   example: 'New York, USA',
  // })
  address?: string;

  @IsOptional()
  @ApiProperty({
    description: 'Image (optional)',
    example: 'profile.jpg',
    format: 'binary',
    type: String,
    required: false,
  })
  image?: string;
}

export class ResetPasswordDto {
  @IsNotEmpty()
  @IsEmail()
  @ApiProperty({
    description: 'Email address of the user',
    example: 'john@example.com',
  })
  email: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Token',
    example: 'token',
  })
  token: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Password',
    example: 'password',
  })
  password: string;
}

export class ChangePasswordDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Old password',
    example: 'old_password',
  })
  old_password: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'New password',
    example: 'new_password',
  })
  new_password: string;
}
