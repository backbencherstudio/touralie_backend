import { ApiProperty } from '@nestjs/swagger';
import { VideoStatus, Level } from 'prisma/generated/enums';
import { IsOptional, IsString, IsEnum, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateLibraryDto {
  @ApiProperty({ required: false, example: 'Yoga for Beginners' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    required: false,
    example: 'A comprehensive guide to starting your yoga journey.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    required: false,
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  thumbnail?: any;

  @ApiProperty({ required: false, example: 'ckz1234567890' })
  @IsOptional()
  @IsString()
  category_id?: string;

  @ApiProperty({ required: false, example: 3600 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  duration?: number;

  @ApiProperty({ required: false, enum: Level, example: Level.BEGINNER })
  @IsOptional()
  @IsEnum(Level)
  level?: Level;

  @ApiProperty({
    required: false,
    enum: VideoStatus,
    example: VideoStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(VideoStatus)
  status?: VideoStatus;
}
