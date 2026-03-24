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
    summary: 'Browse Video Library (Personalized) (User Only)',
    description: `
Fetch a paginated list of published videos. 
If the authenticated user has personalization goals (e.g., "fat_loss") set in their profile, videos matching those tags will be prioritized in the "Best Match" section.

**Features:**
- Pagination support
- Category filtering
- Date range filtering
- Search by title or description
- Personalization-based sorting
`,
  })
  @ApiResponse({
    status: 200,
    description: 'A list of videos tailored to the user.',
    schema: {
      example: {
        success: true,
        message: 'Videos found successfully',
        data: [
          {
            id: 'cmm632yhc0003kg9wfbdqce74',
            title: 'Strength Training 101',
            thumbnail_url: 'https://example.com/thumb.jpg',
            category: 'Fitness',
            chapters_count: 5,
            created_at: '2026-03-16T10:00:00.000Z',
            duration: 1200,
            level: 'BEGINNER',
            is_favorite: true,
          },
        ],
        meta_data: {
          page: 1,
          limit: 10,
          total: 50,
          search: '',
          filter: {
            category_id: null,
            start_date: null,
            end_date: null,
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
    description: 'Retrieves a list of all video categories used in the library for filtering purposes.',
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
    summary: 'Get My Favorite Videos (User Only)',
    description: 'Returns a paginated list of videos that the user has marked as favorite.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of favorite videos.',
    schema: {
      example: {
        success: true,
        message: 'Videos found successfully',
        data: [
          {
            id: 'cmm632yhc0003kg9wfbdqce74',
            title: 'Strength Training 101',
            duration: 1200,
            level: 'BEGINNER',
            created_at: '2026-03-16T10:00:00.000Z',
            is_favorite: true,
            thumbnail_url: 'https://example.com/storage/videos/thumb.jpg',
            category: 'Fitness',
            chapters_count: 5,
          },
        ],
        meta_data: {
          page: 1,
          limit: 10,
          total: 5,
          search: '',
          filter: {
            category_id: null,
            start_date: null,
            end_date: null,
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
    description: `
Returns a list of videos the user has previously watched or started. 
Includes progress details like last played position.

**Filtering:**
- Use \`watch_status\` to filter by COMPLETED or IN_PROGRESS.
`,
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
            id: 'cmm632yhc0003kg9wfbdqce74',
            title: 'Yoga for Beginners',
            duration: 900,
            level: 'BEGINNER',
            created_at: '2026-03-15T10:00:00.000Z',
            is_completed: false,
            last_played_position: 450,
            thumbnail_url: 'https://example.com/storage/videos/yoga.jpg',
            category: 'Wellness',
            chapters_count: 3,
          },
        ],
        meta_data: {
          page: 1,
          limit: 10,
          total: 12,
          search: '',
          filter: {
            category_id: null,
            start_date: null,
            end_date: null,
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
    summary: 'Get Video Details & Chapters (User Only)',
    description: `
Fetch comprehensive details for a single video, including its chapters and the user's current watch progress.
Use this before launching the video player.
`,
  })
  @ApiResponse({
    status: 200,
    description: 'Complete video object with chapters.',
    schema: {
      example: {
        success: true,
        message: 'Video found successfully',
        data: {
          id: 'cmm632yhc0003kg9wfbdqce74',
          title: 'Full Body Workout',
          description: 'A comprehensive workout for all muscle groups.',
          duration: 1800,
          level: 'INTERMEDIATE',
          created_at: '2026-03-14T10:00:00.000Z',
          is_favorite: false,
          last_watch_position: 120,
          is_completed: false,
          url: 'https://example.com/storage/videos/workout.mp4',
          thumbnail_url: 'https://example.com/storage/videos/workout.jpg',
          category: 'Fitness',
          video_chapters: [
            {
              id: 'chap_1',
              title: 'Warm up',
              start_time: '00:00:00',
              end_time: '00:05:00',
              thumbnail_url: 'https://example.com/storage/videos/warmup.jpg',
            },
          ],
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
- **is_completed**: Boolean flag.
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
