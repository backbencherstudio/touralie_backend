import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

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

export class PublicFiltersQueryDto {
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
    description: 'Category of the video',
    example: 'uid',
    required: false,
  })
  @IsOptional()
  @IsString()
  category_id?: string;
}

export class QueryPublicLibraryDto extends IntersectionType(
  PaginationQueryDto,
  PublicFiltersQueryDto,
) {
  @ApiProperty({
    description: 'Search query',
    example: 'video',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;
}
