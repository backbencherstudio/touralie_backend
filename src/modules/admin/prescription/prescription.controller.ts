import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { PrescriptionService } from './prescription.service';
import {
  CreatePrescriptionDto,
  CreatePrescriptionTemplateDto,
} from './dto/create-prescription.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PrescribedMembersQueryDto } from './dto/query-prescription.dto';

@ApiTags('Prescription')
@ApiBearerAuth('admin_token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.PRACTITIONER)
@Controller('admin/prescription')
export class PrescriptionController {
  constructor(private readonly prescriptionService: PrescriptionService) {}

  @ApiOperation({
    summary: 'Create a new prescription (Admin Only)',
    description: `This endpoint allows administrators to create a new prescription, 
Required fields:
- patient_ids
- video_ids
- instruction
- instruction.points
Optional fields:
- instruction.description`,
  })
  @ApiResponse({
    status: 201,
    description: 'Prescription created successfully',
    schema: {
      example: {
        success: true,
        message: 'Prescription created successfully',
      },
    },
  })
  @Post()
  createPrescription(@Body() createPrescriptionDto: CreatePrescriptionDto) {
    return this.prescriptionService.createPrescription(createPrescriptionDto);
  }

  @ApiOperation({
    summary: 'Create a new prescription template (Admin Only)',
    description: `This endpoint allows administrators to create a new prescription template, 
Required fields:
- title
- video_ids`,
  })
  @ApiResponse({
    status: 201,
    description: 'Prescription template created successfully',
    schema: {
      example: {
        success: true,
        message: 'Prescription template created successfully',
      },
    },
  })
  @Post('template')
  createPrescriptionTemplate(
    @Body() createPrescriptionTemplateDto: CreatePrescriptionTemplateDto,
  ) {
    return this.prescriptionService.createPrescriptionTemplate(
      createPrescriptionTemplateDto,
    );
  }

  @ApiOperation({
    summary: 'Find all prescribed members (Admin Only)',
    description: `This endpoint allows administrators to find all prescribed members. You can filter by: 
    - date
    - search by name, email, or video title.
    - pagination is available`,
  })
  @ApiResponse({
    status: 200,
    description: 'Prescribed members found successfully',
    schema: {
      example: {
        success: true,
        message: 'Prescribed members found successfully',
        data: [
          {
            id: 1,
            user_id: 1,
            name: 'John Doe',
            email: 'email',
            title: 'Prescription 1',
            prescribed_at: '2026-01-01T00:00:00.000Z',
            total_videos: 2,
          },
        ],
        meta_data: {
          page: 1,
          limit: 10,
          total: 1,
          filters: {
            start_date: '2026-01-01',
            end_date: '2026-12-31',
          },
        },
      },
    },
  })
  @Get()
  findAllPrescription(@Query() query: PrescribedMembersQueryDto) {
    return this.prescriptionService.findAllPrescription(query);
  }

  @ApiOperation({
    summary: 'Find all prescription templates (Admin Only)',
    description: `This endpoint allows administrators to find all prescription templates.`,
  })
  @ApiResponse({
    status: 200,
    description: 'Prescription templates found successfully',
    schema: {
      example: {
        success: true,
        message: 'Prescription templates found successfully',
        data: [
          {
            id: 'uuid',
            title: 'Prescription Template 1',
            created_at: '2026-01-01T00:00:00.000Z',
            total_videos: 2,
          },
        ],
        meta_data: {
          page: 1,
          limit: 10,
          total: 1,
          filters: {
            start_date: '2026-01-01',
            end_date: '2026-12-31',
          },
        },
      },
    },
  })
  @Get('template')
  findAllPrescriptionTemplates(@Query() query: PrescribedMembersQueryDto) {
    return this.prescriptionService.findAllPrescriptionTemplates(query);
  }

  @ApiOperation({
    summary: 'Find one prescription (Admin Only)',
    description: `This endpoint allows administrators to find one prescription.
    - patientId param is required
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Prescription found successfully',
    schema: {
      example: {
        success: true,
        message: 'Prescription found successfully',
        data: {
          patient_id: 'uuid',
          member_id: 'uuid',
          member_name: 'John Doe',
          member_email: 'email',
          prescription_id: 'uuid',
          title: 'title',
          videos: [
            {
              video_id: 'uuid',
              reps: 10,
              sets: 10,
              weight: 10,
              note: 'note',
              title: 'Video 1',
              description: 'description',
              duration: 10,
              thumbnail_url: 'thumbnail_url',
              url: 'url',
              category: 'category',
            },
          ],
        },
      },
    },
  })
  @Get(':patientId')
  findOnePrescription(@Param('patientId') id: string) {
    return this.prescriptionService.findOnePrescription(id);
  }

  @ApiOperation({
    summary: 'Find one prescription template (Admin Only)',
    description: `This endpoint allows administrators to find one prescription template.
    - templateId param is required
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Prescription template found successfully',
    schema: {
      example: {
        success: true,
        message: 'Prescription template found successfully',
        data: {
          id: 'uuid',
          title: 'Prescription Template 1',
          total_videos: 2,
          videos: [
            {
              id: 'uuid',
              title: 'Video 1',
              duration: 10,
              thumbnail_url: 'thumbnail_url',
              url: 'url',
              category: 'category',
            },
            {
              id: 'uuid',
              title: 'Video 2',
              duration: 20,
              thumbnail_url: 'thumbnail_url',
              url: 'url',
              category: 'category',
            },
          ],
        },
      },
    },
  })
  @Get('template/:templateId')
  findOnePrescriptionTemplate(@Param('templateId') id: string) {
    return this.prescriptionService.findOnePrescriptionTemplate(id);
  }
  @ApiOperation({
    summary: 'Delete one prescription template (Admin Only)',
    description: `This endpoint allows administrators to delete one prescription template.
    - templateId param is required
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Prescription template deleted successfully',
    schema: {
      example: {
        success: true,
        message: 'Prescription template deleted successfully',
      },
    },
  })
  @Delete('template/:templateId')
  removePrescriptionTemplate(@Param('templateId') id: string) {
    return this.prescriptionService.removePrescriptionTemplate(id);
  }

  @ApiOperation({
    summary: 'Delete one prescription (Admin Only)',
    description: `This endpoint allows administrators to delete one prescription.
    - patient-id param is required
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Prescription deleted successfully',
    schema: {
      example: {
        success: true,
        message: 'Prescription deleted successfully',
      },
    },
  })
  @Delete(':patientId')
  removePrescription(@Param('patientId') id: string) {
    return this.prescriptionService.removePrescription(id);
  }
}
