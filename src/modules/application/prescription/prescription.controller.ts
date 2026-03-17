import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { PrescriptionService } from './prescription.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';
import { QueryPrescriptionDto } from './dto/query-prescription.dto';
import { Request } from 'express';

@ApiTags('Prescription')
@ApiBearerAuth('user_token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.USER)
@Controller('prescription')
export class PrescriptionController {
  constructor(private readonly prescriptionService: PrescriptionService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all prescribed videos (User Only)',
    description:
      'Returns a list of unique videos that have been prescribed to the user.',
  })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Prescriptions found successfully',
        },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              thumbnail_url: { type: 'string' },
              watch_status: { type: 'string' },
              category: { type: 'string' },
              chapters_count: { type: 'number' },
              created_at: { type: 'string' },
              duration: { type: 'number' },
              level: { type: 'string' },
              is_completed: { type: 'boolean' },
              last_watch_position: { type: 'number' },
            },
          },
        },
        meta_data: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
            search: { type: 'string' },
          },
        },
      },
    },
  })
  findAllPrescriptions(
    @Query() query: QueryPrescriptionDto,
    @Req() req: Request,
  ) {
    const { userId } = req?.user as any;
    return this.prescriptionService.findAllPrescriptions(query, userId);
  }

  @ApiOperation({
    summary: 'Get the next/last video to resume (User Only)',
    description:
      'Returns the video the user was last watching (if incomplete), or the next unplayed video in the queue.',
  })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          nullable: true,
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            url: { type: 'string' },
            thumbnail_url: { type: 'string' },
            category: { type: 'string' },
            duration: { type: 'number' },
            level: { type: 'string' },
            is_completed: { type: 'boolean' },
            last_watch_position: { type: 'number' },
            watch_status: { type: 'string' },
            instruction: {
              type: 'object',
              properties: {
                description: { type: 'string' },
                points: { type: 'array', items: { type: 'string' } },
              },
            },
            video_chapters: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  title: { type: 'string' },
                  start_time: { type: 'string' },
                  end_time: { type: 'string' },
                  thumbnail_url: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  })
  @Get('resume')
  async getResumeVideo(@Req() req: Request) {
    const { userId } = req?.user as any;
    return this.prescriptionService.lastPlayedPrescriptionVideo(userId);
  }
}
