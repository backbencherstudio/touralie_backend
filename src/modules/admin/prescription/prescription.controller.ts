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
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { UpdatePrescriptionDto } from './dto/update-prescription.dto';
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
@Roles(Role.ADMIN)
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
            videos: ['Video 1', 'Video 2'],
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
    summary: 'Find one prescription (Admin Only)',
    description: `This endpoint allows administrators to find one prescription.
    - patient-id param is required
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
          instruction: {
            instruction_id: 'uuid',
            description: 'description',
            points: ['point 1', 'point 2'],
          },
          videos: [
            {
              video_id: 'uuid',
              title: 'Video 1',
              description: 'description',
              duration: 10,
              thumbnail_url: 'thumbnail_url',
              url: 'url',
              video_chapters: [
                {
                  id: 1,
                  title: 'chapter 1',
                  start_time: 0,
                  end_time: 10,
                },
              ],
              category: 'category',
            },
          ],
        },
      },
    },
  })
  @Get(':patient-id')
  findOnePrescription(@Param('patient-id') id: string) {
    return this.prescriptionService.findOnePrescription(id);
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
  @Delete(':patient-id')
  removePrescription(@Param('patient-id') id: string) {
    return this.prescriptionService.removePrescription(id);
  }
}
