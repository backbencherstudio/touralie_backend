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
@Controller('library')
export class LibraryController {
  constructor(private readonly libraryService: LibraryService) {}

  @ApiOperation({
    summary: 'Browse Library (User Only)',
    description:
      'Fetch a paginated list of published media (VIDEO, IMAGE, PDF). Only `OTHER` type items are returned.\n\n' +
      '- `media_type` indicates the file type: `VIDEO`, `IMAGE`, or `PDF`\n' +
      '- `thumbnail_url` is `null` for IMAGE and PDF\n' +
      '- `duration` is `null` for IMAGE and PDF\n' +
      '- Filter by `media_type` to get only specific types',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of media items.',
    schema: {
      example: {
        success: true,
        message: 'Videos found successfully',
        data: [
          {
            id: 'cm9vid001',
            title: 'Full Body Workout',
            duration: 1800,
            created_at: '2026-03-14T10:00:00.000Z',
            is_favorite: true,
            thumbnail_url: 'https://storage.example.com/thumbnails/workout.jpg',
            category: 'Fitness',
            media_type: 'VIDEO',
          },
          {
            id: 'cm9img002',
            title: 'Exercise Posture Guide',
            duration: null,
            created_at: '2026-05-01T08:00:00.000Z',
            is_favorite: false,
            thumbnail_url: null,
            category: 'Education',
            media_type: 'IMAGE',
          },
          {
            id: 'cm9pdf003',
            title: 'Nutrition Handbook',
            duration: null,
            created_at: '2026-06-10T09:00:00.000Z',
            is_favorite: false,
            thumbnail_url: null,
            category: 'Nutrition',
            media_type: 'PDF',
          },
        ],
        meta_data: {
          page: 1,
          limit: 10,
          total: 3,
          search: null,
          filter: {
            category_id: null,
            start_date: null,
            end_date: null,
            media_type: null,
          },
        },
      },
    },
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  @Get()
  findAll(@Req() req: Request, @Query() query: QueryPublicLibraryDto) {
    const { userId } = req?.user;
    return this.libraryService.findAll(query, userId);
  }

  @ApiOperation({
    summary: 'Get All Available Categories (Public)',
    description:
      'Retrieves a list of all video categories used in the library for filtering purposes.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of categories.',
    schema: {
      example: {
        success: true,
        message: 'Categories found successfully',
        data: [
          {
            id: 'cat_123',
            title: 'Strength',
          },
          {
            id: 'cat_456',
            title: 'Mobility',
          },
        ],
      },
    },
  })
  @Get('categories')
  findAllCategories() {
    return this.libraryService.findAllCategories();
  }

  @ApiOperation({
    summary: 'Get My Favorites (User Only)',
    description: 'Paginated list of favorited media items. Includes VIDEO, IMAGE, and PDF types.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of favorite media items.',
    schema: {
      example: {
        success: true,
        message: 'Videos found successfully',
        data: [
          {
            id: 'cm9vid001',
            title: 'Full Body Workout',
            duration: 1800,
            created_at: '2026-03-14T10:00:00.000Z',
            is_favorite: true,
            thumbnail_url: 'https://storage.example.com/thumbnails/workout.jpg',
            category: 'Fitness',
            media_type: 'VIDEO',
          },
          {
            id: 'cm9pdf003',
            title: 'Nutrition Handbook',
            duration: null,
            created_at: '2026-06-10T09:00:00.000Z',
            is_favorite: true,
            thumbnail_url: null,
            category: 'Nutrition',
            media_type: 'PDF',
          },
        ],
        meta_data: {
          page: 1,
          limit: 10,
          total: 2,
          search: null,
          filter: {
            category_id: null,
            start_date: null,
            end_date: null,
            media_type: null,
          },
        },
      },
    },
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  @Get('favorites')
  findAllFavoriteVideos(
    @Req() req: Request,
    @Query() query: QueryPublicLibraryDto,
  ) {
    const { userId } = req?.user;
    return this.libraryService.findAllFavoriteVideos(query, userId);
  }

  @ApiOperation({
    summary: 'Get My Watch History (User Only)',
    description:
      'Returns media the user has viewed. Only VIDEO items have `watch_status`, `is_completed`, and `last_played_position`. IMAGE and PDF items do not include these fields.',
  })
  @ApiResponse({
    status: 200,
    description: 'User watch history.',
    schema: {
      example: {
        success: true,
        message: 'Watch history found successfully',
        data: [
          {
            id: 'cm9vid001',
            title: 'Full Body Workout',
            duration: 1800,
            created_at: '2026-03-14T10:00:00.000Z',
            watch_status: 'IN_PROGRESS',
            is_completed: false,
            last_played_position: 450,
            thumbnail_url: 'https://storage.example.com/thumbnails/workout.jpg',
            category: 'Fitness',
            media_type: 'VIDEO',
          },
          {
            id: 'cm9pdf003',
            title: 'Nutrition Handbook',
            duration: null,
            created_at: '2026-06-10T09:00:00.000Z',
            thumbnail_url: null,
            category: 'Nutrition',
            media_type: 'PDF',
          },
        ],
        meta_data: {
          page: 1,
          limit: 10,
          total: 2,
          search: null,
          filter: {
            category_id: null,
            start_date: null,
            end_date: null,
            media_type: null,
          },
        },
      },
    },
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  @Get('watch-history')
  findAllWatchHistory(
    @Req() req: Request,
    @Query() query: QueryWatchHistoryDto,
  ) {
    const { userId } = req?.user;
    return this.libraryService.findAllWatchHistory(query, userId);
  }

  @ApiOperation({
    summary: 'Get Media Item Details (User Only)',
    description:
      'Returns full details for a single media item.\n\n' +
      '- **VIDEO**: Returns `duration`, `thumbnail_url`, `last_watch_position`, `is_completed`\n' +
      '- **IMAGE**: Returns only `url` (image URL). `duration`, `thumbnail_url`, `last_watch_position`, `is_completed` are **omitted**\n' +
      '- **PDF**: Returns only `url` (PDF URL). Same fields omitted as IMAGE',
  })
  @ApiResponse({
    status: 200,
    description: 'VIDEO example',
    schema: {
      example: {
        success: true,
        message: 'Media found successfully',
        data: {
          id: 'cm9vid001',
          title: 'Full Body Workout',
          description: 'A comprehensive 30-min workout session.',
          duration: 1800,
          created_at: '2026-03-14T10:00:00.000Z',
          is_favorite: false,
          last_watch_position: 120,
          is_completed: false,
          url: 'https://storage.example.com/videos/workout.mp4',
          thumbnail_url: 'https://storage.example.com/thumbnails/workout.jpg',
          category: 'Fitness',
          media_type: 'VIDEO',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'IMAGE example',
    schema: {
      example: {
        success: true,
        message: 'Media found successfully',
        data: {
          id: 'cm9img002',
          title: 'Exercise Posture Guide',
          description: 'Visual guide for correct exercise posture.',
          duration: null,
          created_at: '2026-05-01T08:00:00.000Z',
          is_favorite: true,
          url: 'https://storage.example.com/media/posture_guide.png',
          thumbnail_url: null,
          category: 'Education',
          media_type: 'IMAGE',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'PDF example',
    schema: {
      example: {
        success: true,
        message: 'Media found successfully',
        data: {
          id: 'cm9pdf003',
          title: 'Nutrition Handbook',
          description: 'Complete guide to sports nutrition.',
          duration: null,
          created_at: '2026-06-10T09:00:00.000Z',
          is_favorite: false,
          url: 'https://storage.example.com/media/nutrition_handbook.pdf',
          thumbnail_url: null,
          category: 'Nutrition',
          media_type: 'PDF',
        },
      },
    },
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request) {
    const { userId } = req?.user as any;
    return this.libraryService.findOne(id, userId);
  }

  @ApiOperation({
    summary: 'Toggle Favorite Status (User Only)',
    description: `
Marks a video as favorite or removes it from favorites if already present.
Returns the new status.
`,
  })
  @ApiResponse({
    status: 200,
    description: 'Favorite status updated.',
    schema: {
      example: {
        success: true,
        message: 'Video favorited successfully',
      },
    },
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  @Patch(':id/favorite')
  favorite(@Param('id') id: string, @Req() req: Request) {
    const { userId } = req?.user;
    return this.libraryService.favorite(id, userId);
  }

  @ApiOperation({
    summary: 'Update Playback Progress (User Only)',
    description: `
Saves the user's current playback position in a video. 
Call this periodically during playback to ensure progress is saved.

**Fields:**
- **last_played_position**: Time in seconds.
- **prescription_id**: Optional for normal library videos. Send it when updating progress from a prescription video, so resume can return the same prescription context.
`,
  })
  @ApiResponse({
    status: 200,
    description: 'Progress saved successfully.',
    schema: {
      example: {
        success: true,
        message: 'Watch progress updated successfully',
      },
    },
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
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
