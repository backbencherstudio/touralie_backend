import { ApiProperty } from '@nestjs/swagger';
import { VideoStatus, Visibility } from 'prisma/generated/enums';
import {
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  ValidateIf,
  IsArray,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

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

  @ApiProperty({
    required: false,
    enum: Visibility,
    example: Visibility.PUBLIC,
    description:
      'Update this filed only for other videos not for prescribable videos',
  })
  @IsOptional()
  @IsEnum(Visibility)
  visibility?: Visibility;

  @ValidateIf((ob) => ob.visibility === Visibility.LISTED)
  @ApiProperty({
    required: false,
    type: [String],
    example: ['id1', 'id2'],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') return [value];
    return value;
  })
  @IsArray()
  @IsString({ each: true })
  user_ids?: string[];

  @ApiProperty({
    required: false,
    enum: VideoStatus,
    example: VideoStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(VideoStatus)
  status?: VideoStatus;
}
