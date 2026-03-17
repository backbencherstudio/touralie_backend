import {
  Controller,
  Get,
  Param,
  UseGuards,
  Query,
  Req,
  Patch,
  Body,
} from '@nestjs/common';
import { LibraryService } from './library.service';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Role } from 'src/common/guard/role/role.enum';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from 'src/common/guard/role/roles.decorator';
import {
  QueryPublicLibraryDto,
  QueryWatchHistoryDto,
} from './dto/query-library.dto';
import { Request } from 'express';
import { UpdateWatchProgressDto } from './dto/update-watch-progress.dto';

@ApiTags('Library')
@ApiBearerAuth('user_token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.USER)
@Controller('library')
export class LibraryController {
  constructor(private readonly libraryService: LibraryService) {}

  @ApiOperation({
    summary: 'Get all videos (Personalized) (User Only)',
    description:
      'Returns a list of published videos. If the user has personalization tags set, matching videos will appear first (Best Match).',
  })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Videos found successfully' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              thumbnail_url: { type: 'string' },
              category: { type: 'string' },
              chapters_count: { type: 'number' },
              created_at: { type: 'string' },
              duration: { type: 'number' },
              level: { type: 'string' },
              is_favorite: { type: 'boolean' },
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
            filter: {
              type: 'object',
              properties: {
                category_id: { type: 'string' },
                start_date: { type: 'string' },
                end_date: { type: 'string' },
              },
            },
          },
        },
      },
    },
  })
  @Get()
  findAll(@Req() req: Request, @Query() query: QueryPublicLibraryDto) {
    const { userId } = req?.user;
    return this.libraryService.findAll(query, userId);
  }

  @ApiOperation({
    summary: 'Get all categories (User Only)',
    description: 'Returns a list of all categories.',
  })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Categories found successfully' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
            },
          },
        },
      },
    },
  })
  @Get('categories')
  findAllCategories() {
    return this.libraryService.findAllCategories();
  }

  @Get('favorites')
  @ApiOperation({
    summary: 'Get all favorite videos (User Only)',
    description: 'Returns a list of all favorite videos.',
  })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Favorite videos found successfully',
        },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              thumbnail_url: { type: 'string' },
              category: { type: 'string' },
              chapters_count: { type: 'number' },
              created_at: { type: 'string' },
              duration: { type: 'number' },
              level: { type: 'string' },
              is_favorite: { type: 'boolean' },
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
            filter: {
              type: 'object',
              properties: {
                category_id: { type: 'string' },
                start_date: { type: 'string' },
                end_date: { type: 'string' },
              },
            },
          },
        },
      },
    },
  })
  findAllFavoriteVideos(
    @Req() req: Request,
    @Query() query: QueryPublicLibraryDto,
  ) {
    const { userId } = req?.user;
    return this.libraryService.findAllFavoriteVideos(query, userId);
  }

  @Get('watch-history')
  @ApiOperation({
    summary: 'Get all watch history (User Only)',
    description: 'Returns a list of all watch history.',
  })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Watch history found successfully',
        },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              thumbnail_url: { type: 'string' },
              category: { type: 'string' },
              chapters_count: { type: 'number' },
              created_at: { type: 'string' },
              duration: { type: 'number' },
              level: { type: 'string' },
              is_favorite: { type: 'boolean' },
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
            filter: {
              type: 'object',
              properties: {
                category_id: { type: 'string' },
                start_date: { type: 'string' },
                end_date: { type: 'string' },
              },
            },
          },
        },
      },
    },
  })
  findAllWatchHistory(
    @Req() req: Request,
    @Query() query: QueryWatchHistoryDto,
  ) {
    const { userId } = req?.user;
    return this.libraryService.findAllWatchHistory(query, userId);
  }

  @ApiOperation({
    summary: 'Get single video by ID (User Only)',
    description: 'Returns full video details including chapters.',
  })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Video found successfully' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            url: { type: 'string' },
            thumbnail_url: { type: 'string' },
            is_favorite: { type: 'boolean' },
            last_watch_position: { type: 'number' },
            is_completed: { type: 'boolean' },
            category: { type: 'string' },
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
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request) {
    const { userId } = req?.user as any;
    return this.libraryService.findOne(id, userId);
  }

  @ApiOperation({
    summary: 'Favorite a video (User Only)',
    description: `Adds a video to the user's favorites. If the video is already favorited, it will be unfavorited.
    
    - video "id" is required`,
  })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Video favorited successfully' },
      },
    },
  })
  @Patch(':id/favorite')
  favorite(@Param('id') id: string, @Req() req: Request) {
    const { userId } = req?.user;
    return this.libraryService.favorite(id, userId);
  }

  @ApiOperation({
    summary: 'Update video watch progress (User Only)',
    description:
      'Updates the last played position and completion status of a video.',
  })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Watch progress updated successfully',
        },
      },
    },
  })
  @Patch(':id/progress')
  updateProgress(
    @Param('id') id: string,
    @Req() req: Request,
    @Body() updateWatchProgressDto: UpdateWatchProgressDto,
  ) {
    const { userId } = req?.user;
    return this.libraryService.updateProgress(
      id,
      userId,
      updateWatchProgressDto,
    );
  }
}
