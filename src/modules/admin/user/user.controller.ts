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
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserByAdminDto } from './dto/update-user.dto';
import {
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '../../../common/guard/role/role.enum';
import { Roles } from '../../../common/guard/role/roles.decorator';
import { RolesGuard } from '../../../common/guard/role/roles.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { QueryUserDto } from './dto/query-user.dto';

@ApiBearerAuth('admin_token')
@ApiTags('User')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiExcludeEndpoint()
  @ApiResponse({ description: 'Create a user' })
  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    try {
      const user = await this.userService.create(createUserDto);
      return user;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({
    summary: 'Get all members (Admin only)',
    description: `
    Get all users
    
    Query Parameters:
    - search: Search by name, email, phone number, address
    - status: Filter by status (pending, active, inactive)
    - type: Filter by gender (male, female)
    - page: Page number
    - limit: Number of items per page
    - start_date: Start date
    - end_date: End date
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Get all users',
    schema: {
      example: {
        success: true,
        message: 'Users fetched successfully',
        data: [
          {
            id: 'uuid',
            name: 'John Doe',
            email: 'email',
            weight: 70,
            height: 175,
            gender: 'male',
            type: 'user',
            date_of_birth: '1998-05-20T00:00:00.000Z',
            created_at: '2026-03-16T00:00:00.000Z',
          },
        ],
        meta_data: {
          page: 1,
          limit: 10,
          total: 1,
          search: 'search',
          filter: {
            status: 'pending',
            type: 'male',
            start_date: '2026-01-01',
            end_date: '2026-12-31',
          },
        },
      },
    },
  })
  @Get()
  async findAll(@Query() query: QueryUserDto) {
    const users = await this.userService.findAll(query);
    return users;
  }

  // approve user
  @ApiExcludeEndpoint()
  @ApiResponse({ description: 'Approve a user' })
  @Post(':id/approve')
  async approve(@Param('id') id: string) {
    try {
      const user = await this.userService.approve(id);
      return user;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // reject user
  @ApiExcludeEndpoint()
  @ApiResponse({ description: 'Reject a user' })
  @Post(':id/reject')
  async reject(@Param('id') id: string) {
    try {
      const user = await this.userService.reject(id);
      return user;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiResponse({ description: 'Get a user by id' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const user = await this.userService.findOne(id);
      return user;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({
    summary: 'Ban or unban a user',
    description: `
    Ban or unban a user
    
    Path Parameters:
    - id: User ID
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Ban or unban a user',
    schema: {
      example: {
        success: true,
        message: 'User banned or unbanned successfully',
      },
    },
  })
  @Patch(':id/ban-unban')
  async banUnbanUser(@Param('id') id: string) {
    const user = await this.userService.banUnbanUser(id);
    return user;
  }

  @ApiOperation({
    summary: 'Update a user',
    description: `
    Update a user
    
    Path Parameters:
    - id: User ID
    
    Body Parameters:
    - name: Name of the user
    - email: Email address of the user
    - weight: Weight of the user in kilograms
    - height: Height of the user in centimeters
    - gender: Gender of the user
    - date_of_birth: Date of birth of the user
    - personalization: Personalization preferences for the user (e.g., [fitness, fat_loss, mobility] goals)
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Update a user',
    schema: {
      example: {
        success: true,
        message: 'User updated successfully',
      },
    },
  })
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserByAdminDto,
  ) {
    const user = await this.userService.update(id, updateUserDto);
    return user;
  }

  @ApiOperation({
    summary: 'Delete a user',
    description: `
    Delete a user
    
    Path Parameters:
    - id: User ID
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Delete a user',
    schema: {
      example: {
        success: true,
        message: 'User deleted successfully',
      },
    },
  })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
