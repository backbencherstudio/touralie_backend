import { IsOptional, IsString } from 'class-validator';

export class UserStatsQueryDto {
  @IsOptional()
  @IsString()
  year?: string;
}
