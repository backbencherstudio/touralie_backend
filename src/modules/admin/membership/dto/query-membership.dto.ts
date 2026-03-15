import { IsNumber, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class PaginationQueryDto {
  @ApiProperty({
    description: 'Page number',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value ? Number(value) : 1))
  page: number;

  @ApiProperty({
    description: 'Limit of items per page',
    example: 10,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value ? Number(value) : 10))
  limit: number;
}

export class MemberLeadsQueryDto extends PaginationQueryDto {
  @ApiProperty({
    description: 'Search query',
    example: 'John Doe',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;
}
