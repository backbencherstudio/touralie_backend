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
              total_videos: { type: 'number' },
              total_completed_videos: { type: 'number' },
              created_at: { type: 'string' },
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
            prescription_id: { type: 'string' },
            video_id: { type: 'string' },
            prescription_title: { type: 'string' },
            video_title: { type: 'string' },
            video_thumbnail: { type: 'string' },
            video_duration: { type: 'number' },
            last_played_position: { type: 'number' },
            total_videos: { type: 'number' },
            watch_status: { type: 'string' },
            progress: { type: 'number' },
            progress_message: { type: 'string' },
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

  @Get(':id')
  @ApiOperation({
    summary: 'Get a single prescription (User Only)',
    description:
      'Returns a single prescription with all its videos and their details.',
  })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Prescription found successfully',
        },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            last_played_video_id: { type: 'string', nullable: true },
            created_at: { type: 'string' },
            videos: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  reps: { type: 'number' },
                  sets: { type: 'number' },
                  weight: { type: 'number' },
                  note: { type: 'string' },
                  title: { type: 'string' },
                  description: { type: 'string' },
                  url: { type: 'string' },
                  thumbnail_url: { type: 'string' },
                  category: { type: 'string' },
                  last_played_position: { type: 'number' },
                  is_completed: { type: 'boolean' },
                },
              },
            },
          },
        },
      },
    },
  })
  findOnePrescription(@Param('id') id: string, @Req() req: Request) {
    const { userId } = req?.user as any;
    return this.prescriptionService.findOnePrescription(id, userId);
  }
}
