import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class InitVideoUploadDto {
  @ApiProperty({
    description: 'Original filename of the video',
    example: 'my_video.mp4',
  })
  @IsString()
  @IsNotEmpty()
  filename: string;

  @ApiProperty({
    description: 'Thumbnail image',
    type: 'string',
    format: 'binary',
    required: false,
  })
  @IsOptional()
  thumbnail?: any;
}
