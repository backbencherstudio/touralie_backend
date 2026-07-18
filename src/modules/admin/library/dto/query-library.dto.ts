import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { VideoType, MediaType } from 'prisma/generated/enums';


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

export enum LibraryQueryStatus {
  ALL = 'ALL',
  DRAFT = 'DRAFT',
  UPLOADING = 'UPLOADING',
  PUBLISHED = 'PUBLISHED',
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
    description: 'Status of the video',
    enum: LibraryQueryStatus,
    example: LibraryQueryStatus.ALL,
    required: false,
  })
  @IsOptional()
  @IsEnum(LibraryQueryStatus)
  status?: LibraryQueryStatus = LibraryQueryStatus.ALL;

  @ApiProperty({
    description: 'Category of the video',
    example: 'uid',
    required: false,
  })
  @IsOptional()
  @IsString()
  category_id?: string;

  @ApiProperty({
    description: 'Type of the video',
    enum: VideoType,
    example: VideoType.PRESCRIBABLE,
    required: false,
  })
  @IsOptional()
  @IsEnum(VideoType)
  type?: VideoType;

  @ApiProperty({
    description: 'Media type of the item',
    enum: MediaType,
    example: MediaType.VIDEO,
    required: false,
  })
  @IsOptional()
  @IsEnum(MediaType)
  media_type?: MediaType;
}

export class QueryLibraryDto extends IntersectionType(
  PaginationQueryDto,
  FiltersQueryDto,
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
