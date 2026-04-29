import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class UpdateWatchProgressDto {
  @ApiProperty({
    description: 'Last played position in seconds',
    example: 120,
    required: true,
  })
  @IsInt()
  @Min(0)
  @IsNotEmpty()
  last_played_position: number;

  @ApiProperty({
    description:
      'Optional. Send this when saving progress from a prescription video so prescription resume can use the exact prescription context.',
    example: 'cmm632yhc0003kg9wfbdqce74',
    required: false,
  })
  @IsOptional()
  @IsString()
  prescription_id?: string;
}
