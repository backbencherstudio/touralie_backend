import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateChapterDto {
  @ApiProperty({ example: 'Introduction' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: '00:01:20',
    description: 'Format: HH:MM:SS or MM:SS',
  })
  @IsString()
  @IsNotEmpty()
  start_time: string;

  @ApiProperty({
    example: '00:05:45',
    description: 'Format: HH:MM:SS or MM:SS',
  })
  @IsString()
  @IsNotEmpty()
  end_time: string;

  @ApiProperty({
    example: 'thumbnail.jpg',
    required: false,
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  thumbnail?: any;
}
