import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({
    description: 'Category title',
    example: 'All',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  title: string;
}
