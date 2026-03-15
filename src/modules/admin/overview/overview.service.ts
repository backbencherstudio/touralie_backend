import { Injectable } from '@nestjs/common';
import { CreateOverviewDto } from './dto/create-overview.dto';
import { UpdateOverviewDto } from './dto/update-overview.dto';

@Injectable()
export class OverviewService {
  create(createOverviewDto: CreateOverviewDto) {
    return 'This action adds a new overview';
  }

  findAll() {
    return `This action returns all overview`;
  }

  findOne(id: number) {
    return `This action returns a #${id} overview`;
  }

  update(id: number, updateOverviewDto: UpdateOverviewDto) {
    return `This action updates a #${id} overview`;
  }

  remove(id: number) {
    return `This action removes a #${id} overview`;
  }
}
