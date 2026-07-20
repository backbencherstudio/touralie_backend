import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';
import { type } from 'os';
import { VideoType, Visibility, MediaType } from 'prisma/generated/enums';

export class InitVideoUploadDto {
  @ApiProperty({
    description: 'Original filename of the video',
    example: 'my_video.mp4',
  })
  @IsString()
  @IsNotEmpty()
  filename: string;

  @ApiProperty({
    description: 'Video duration in seconds',
    example: 300,
    required: false,
  })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  duration?: number;

  @ApiProperty({
    description: 'Type of the video',
    required: false,
    enum: VideoType,
    example: VideoType.PRESCRIBABLE,
  })
  @IsOptional()
  @IsEnum(VideoType)
  type?: VideoType;

  @ValidateIf((ob) => ob?.type === VideoType?.PRESCRIBABLE)
  @IsOptional()
  @IsEnum(Visibility)
  visibility?: Visibility = Visibility.PUBLIC;

  @ApiProperty({
    description:
      'Media type (defaults to inference from filename extension if not provided)',
    required: false,
    enum: MediaType,
    example: MediaType.VIDEO,
  })
  @IsOptional()
  @IsEnum(MediaType)
  media_type?: MediaType;

  @ApiProperty({
    description: 'Thumbnail image',
    type: 'string',
    format: 'binary',
    required: false,
  })
  @IsOptional()
  thumbnail?: any;
}
