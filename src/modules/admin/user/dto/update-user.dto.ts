import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNumber,
  IsEmail,
  IsIn,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateUserByAdminDto {
  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional()
  weight?: number;

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional()
  height?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ApiPropertyOptional({ type: [String] })
  personalization?: string[];

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @ApiPropertyOptional()
  name?: string;

  @IsOptional()
  @IsEmail()
  @ApiPropertyOptional()
  email?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  @ApiPropertyOptional({ example: '1990-05-15', nullable: true })
  date_of_birth?: string | null;

  @IsOptional()
  @IsIn(['male', 'female', 'other'])
  @ApiPropertyOptional({ enum: ['male', 'female', 'other'], nullable: true })
  gender?: string | null;
}
