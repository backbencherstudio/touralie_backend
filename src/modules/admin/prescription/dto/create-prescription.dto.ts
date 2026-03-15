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

export class CreatePrescriptionDto {
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
    type: [String],
    example: ['vid-001', 'vid-002'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  video_ids: string[];

  @ApiProperty({
    description: 'Detailed instructions for the prescription',
    type: InstructionDto,
  })
  @ValidateNested()
  @Type(() => InstructionDto)
  @IsNotEmpty()
  instruction: InstructionDto;
}
