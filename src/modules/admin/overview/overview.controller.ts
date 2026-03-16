import { Controller, Get, Query } from '@nestjs/common';
import { OverviewService } from './overview.service';
import { UserStatsQueryDto } from './dto/user-stats-query.dto';

@Controller('admin/overview')
export class OverviewController {
  constructor(private readonly overviewService: OverviewService) {}

  @Get('user-stats')
  getUserStats(@Query() query: UserStatsQueryDto) {
    return this.overviewService.getUserStats(query);
  }

  @Get()
  findAll() {
    return this.overviewService.findAll();
  }
}
