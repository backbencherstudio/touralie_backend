import {
  IsDate,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
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
}

export class PrescribedMembersQueryDto extends IntersectionType(
  PaginationQueryDto,
  FiltersQueryDto,
) {
  @ApiProperty({
    description: 'Search query',
    example: 'John Doe',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;
}
