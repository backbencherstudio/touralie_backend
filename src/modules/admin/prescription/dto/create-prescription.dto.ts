import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  IsNotEmpty,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export class InstructionDto {
  @ApiProperty({
    description: 'The general description of the instruction',
    example: 'Take medicine after dinner',
  })
  @IsString()
  @IsOptional()
  description: string;

  @ApiProperty({
    description: 'List of specific points for the instruction',
    type: [String],
    example: ['Avoid cold water', 'Take rest for 2 hours'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  points: string[];
}

export class PrescribedVideos {
  @ApiProperty({
    description: 'Video ID',
    example: 'vid-001',
  })
  @IsString()
  @IsNotEmpty()
  video_id: string;

  @ApiProperty({
    description: 'Reps per set',
    example: '10',
  })
  @IsString()
  @IsOptional()
  reps: string;

  @ApiProperty({
    description: 'Sets',
    example: '3',
  })
  @IsString()
  @IsOptional()
  sets: string;

  @ApiProperty({
    description: 'Weight',
    example: '10kg',
  })
  @IsString()
  @IsOptional()
  weight: string;

  @ApiProperty({
    description: 'Note',
    example: 'Do this after exercise',
  })
  @IsString()
  @IsOptional()
  note: string;
}

export class CreatePrescriptionDto {
  @ApiProperty({
    description: 'Title of the prescription',
    example: 'Prescription 1',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'List of patient IDs',
    type: [String],
    example: ['uuid-123', 'uuid-456'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  patient_ids: string[];

  @ApiProperty({
    description: 'List of video IDs for exercise or reference',
    type: [PrescribedVideos],
    example: [
      {
        video_id: 'vid-001',
        reps: '10',
        sets: '3',
        weight: '10kg',
        note: 'Do this after exercise',
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrescribedVideos)
  @IsNotEmpty({ each: true })
  videos: PrescribedVideos[];
}

export class CreatePrescriptionTemplateDto {
  @ApiProperty({
    description: 'Title of the prescription template',
    example: 'Prescription Template 1',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'List of video IDs for exercise or reference',
    type: [String],
    example: ['uuid-123', 'uuid-456'],
    required: true,
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  video_ids: string[];
}
