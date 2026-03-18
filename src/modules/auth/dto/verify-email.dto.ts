import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsEmail } from 'class-validator';

export class VerifyEmailDto {
  @IsNotEmpty()
  @IsEmail()
  @ApiProperty({
    description: 'The email address of the user that needs to be verified',
    example: 'john@example.com',
  })
  email: string;

  @IsNotEmpty()
  @ApiProperty({
    description: 'The verification token sent to the user’s email',
    example: '12345',
  })
  token: string;
}

export class ResendVerificationEmailDto {
  @IsNotEmpty()
  @IsEmail()
  @ApiProperty({
    description: 'The email address of the user that needs to be verified',
    example: 'john@example.com',
  })
  email: string;
}
