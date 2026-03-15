import { PartialType } from '@nestjs/swagger';
import { CreateMemberLeadsDto } from './create-membership.dto';

export class UpdateMemberLeadDto extends PartialType(CreateMemberLeadsDto) {}
