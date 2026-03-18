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
    summary: 'Retrieve List of All Users (Admin Only)',
    description: `
Fetch a paginated list of all users registered in the system. 
Allows filtering by status, type (gender), and date range.
The result is sorted by registration date (descending) by default.

**Query Filters:**
- **search**: Partial match on Name, Email, Phone, or Address.
- **status**: Filter by account status (e.g., PENDING, ACTIVE, BANNED).
- **type**: Filter by gender (e.g., MALE, FEMALE).
- **start_date / end_date**: Filter by creation date.
`,
  })
  @ApiResponse({
    status: 200,
    description: 'A list of users with pagination metadata.',
    schema: {
      example: {
        success: true,
        message: 'Users fetched successfully',
        data: [
          {
            id: 'cmm632yhc0003kg9wfbdqce74',
            name: 'John Doe',
            email: 'john@example.com',
            weight: 70,
            height: 175,
            gender: 'male',
            type: 'user',
            status: 1,
            date_of_birth: '1998-05-20T00:00:00.000Z',
            created_at: '2026-03-16T10:00:00.000Z',
          },
        ],
        meta_data: {
          page: 1,
          limit: 10,
          total: 150,
          search: '',
          filter: {
            status: 'ACTIVE',
            type: 'ALL',
            start_date: null,
            end_date: null,
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

  @ApiOperation({
    summary: 'Get Detailed User Profile (Admin Only)',
    description: `
Fetch all available information for a specific user by their Unique ID.
Includes profile details, settings, and activity summary.
`,
  })
  @ApiResponse({
    status: 200,
    description: 'Detailed user profile data.',
  })
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
    summary: 'Ban or Unban User Account (Admin Only)',
    description: `
Toggles the status of a user between ACTIVE and BANNED. 
If a user is banned, they will no longer be able to log in or access protected resources.
`,
  })
  @ApiResponse({
    status: 200,
    description: 'Account status updated successfully.',
    schema: {
      example: {
        success: true,
        message: 'User banned successfully',
      },
    },
  })
  @Patch(':id/ban-unban')
  async banUnbanUser(@Param('id') id: string) {
    const user = await this.userService.banUnbanUser(id);
    return user;
  }

  @ApiOperation({
    summary: 'Update User Information (Admin Only)',
    description: `
Allows an administrator to modify any user's profile details.
Provide only the fields that need to be updated.
`,
  })
  @ApiResponse({
    status: 200,
    description: 'User details updated successfully.',
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
    summary: 'Hard Delete User (Admin Only)',
    description: `
Permanently removes a user account and all associated data from the system.
**Warning:** This action is irreversible.
`,
  })
  @ApiResponse({
    status: 200,
    description: 'User and associated data deleted permanently.',
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
