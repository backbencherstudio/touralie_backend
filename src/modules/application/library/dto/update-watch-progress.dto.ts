import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, Min } from 'class-validator';

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
}
