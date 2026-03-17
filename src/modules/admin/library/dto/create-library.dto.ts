import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsEnum, IsOptional, IsNumber } from 'class-validator';
import { Level } from 'prisma/generated/enums';

export class CreateLibraryDto {
  @ApiProperty({
    description: 'Title of the library',
    example: 'Library Title',
    required: false,
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    description: 'Description of the library',
    example: 'Library Description',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Category id of the library',
    example: 'uuid',
    required: false,
  })
  @IsOptional()
  @IsString()
  category_id?: string;

  @ApiProperty({
    description: 'Video',
    example: 'video.mp4',
    format: 'binary',
    type: String,
    required: true,
  })
  @IsOptional()
  @IsString()
  video?: string;

  @ApiProperty({
    description: 'Thumbnail',
    example: 'thumbnail.jpg',
    format: 'binary',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  thumbnail?: string;

  @ApiProperty({
    description: 'Duration of the library in seconds',
    example: 60,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  duration?: number;

  @ApiProperty({
    description: 'Level of the library',
    example: 'BEGINNER',
    required: false,
  })
  @IsOptional()
  @IsEnum(Level)
  level?: Level = Level.BEGINNER;
}
