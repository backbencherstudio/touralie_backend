import {
  IsDate,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, IntersectionType } from '@nestjs/swagger';

export class PaginationQueryDto {
  @ApiProperty({
    description: 'Page number',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value ? Number(value) : 1))
  page: number = 1;

  @ApiProperty({
    description: 'Limit of items per page',
    example: 10,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value ? Number(value) : 10))
  limit: number = 10;
}

export enum UserStatus {
  ALL = 'ALL',
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  BANNED = 'BANNED',
}
export enum UserType {
  ALL = 'ALL',
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

export class FiltersQueryDto {
  @ApiProperty({
    description: 'Start date (format: YYYY-MM-DD)',
    example: '2026-01-01',
    required: false,
    type: Date,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  start_date?: Date;

  @ApiProperty({
    description: 'End date (format: YYYY-MM-DD)',
    example: '2026-12-31',
    required: false,
    type: Date,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  end_date?: Date;

  @ApiProperty({
    description: 'User status',
    enum: UserStatus,
    example: UserStatus.ALL,
    required: false,
  })
  @IsOptional()
  @IsEnum(UserStatus)
  status: UserStatus = UserStatus.ALL;

  @ApiProperty({
    description: 'User type',
    enum: UserType,
    example: UserType.ALL,
    required: false,
  })
  @IsOptional()
  @IsEnum(UserType)
  type: UserType = UserType.ALL;
}

export class QueryUserDto extends IntersectionType(
  PaginationQueryDto,
  FiltersQueryDto,
) {
  @ApiProperty({
    description: 'Search by name, email, or phone number',
    example: 'John Doe',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'User role',
    enum: ['all', 'practitioner', 'user', 'admin', 'su_admin'],
    example: 'all',
    required: false,
  })
  @IsOptional()
  @IsEnum(['all', 'practitioner', 'user', 'admin', 'su_admin'])
  role: 'all' | 'practitioner' | 'user' | 'admin' | 'su_admin' = 'all';
}
