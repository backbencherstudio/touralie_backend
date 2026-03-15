import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateMemberLeadsDto {
  @ApiProperty({
    description: 'Name of the member',
    example: 'John Doe',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Email of the member',
    example: 'john.doe@example.com',
  })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiProperty({
    description: 'Phone number of the member',
    example: '123456789',
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({
    description: 'Message of the member',
    example: 'Hello',
  })
  @IsString()
  @IsOptional()
  message?: string;
}
