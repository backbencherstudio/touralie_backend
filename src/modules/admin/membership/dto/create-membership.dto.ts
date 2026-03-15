import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { PlanPeriod } from 'prisma/generated/enums';

export class CreateMembershipDto {}
export class CreateMemberShipPlanDto {
  @ApiProperty({
    description: 'Title of the membership plan',
    example: 'Premium Plan',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Description of the membership plan (Optional)',
    example: 'This is a premium membership plan offering extra features.',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Price of the membership plan',
    example: 199.99,
  })
  @Transform((value) => (value ? Number(value) : undefined))
  @IsNumber()
  @IsNotEmpty()
  price: number;

  @ApiProperty({
    description: 'Period of the membership plan (e.g., YEAR, MONTH)',
    enum: PlanPeriod,
    example: 'MONTH',
  })
  @IsEnum(PlanPeriod)
  @IsNotEmpty()
  period: PlanPeriod;

  @ApiProperty({
    description: 'Badge associated with the plan (e.g., "Gold", "Silver")',
    example: 'Gold',
  })
  @IsString()
  @IsNotEmpty()
  badge: string;

  @ApiProperty({
    description: 'List of features associated with the membership plan',
    type: [String],
    example: ['Priority Support', 'Exclusive Content', 'Discount Offers'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  features: string[];
}
