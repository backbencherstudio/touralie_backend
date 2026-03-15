import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { OverviewService } from './overview.service';
import { CreateOverviewDto } from './dto/create-overview.dto';
import { UpdateOverviewDto } from './dto/update-overview.dto';

@Controller('overview')
export class OverviewController {
  constructor(private readonly overviewService: OverviewService) {}

  @Post()
  create(@Body() createOverviewDto: CreateOverviewDto) {
    return this.overviewService.create(createOverviewDto);
  }

  @Get()
  findAll() {
    return this.overviewService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.overviewService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateOverviewDto: UpdateOverviewDto) {
    return this.overviewService.update(+id, updateOverviewDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.overviewService.remove(+id);
  }
}
