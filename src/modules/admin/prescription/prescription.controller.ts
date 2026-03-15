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
@ApiBearerAuth()
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

  @Get(':id')
  findOnePrescription(@Param('id') id: string) {
    return this.prescriptionService.findOnePrescription(+id);
  }

  @Patch(':id')
  updatePrescription(
    @Param('id') id: string,
    @Body() updatePrescriptionDto: UpdatePrescriptionDto,
  ) {
    return this.prescriptionService.updatePrescription(
      +id,
      updatePrescriptionDto,
    );
  }

  @Delete(':id')
  removePrescription(@Param('id') id: string) {
    return this.prescriptionService.removePrescription(+id);
  }
}
