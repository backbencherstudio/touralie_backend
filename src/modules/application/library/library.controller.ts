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
    summary: 'Browse Video Library (Personalized)',
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
  @Get()
  findAll(@Req() req: Request, @Query() query: QueryPublicLibraryDto) {
    const { userId } = req?.user;
    return this.libraryService.findAll(query, userId);
  }

  @ApiOperation({
    summary: 'Get All Available Categories',
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

  @Get('favorites')
  @ApiOperation({
    summary: 'Get My Favorite Videos',
    description: 'Returns a paginated list of videos that the user has marked as favorite.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of favorite videos.',
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
    summary: 'Get My Watch History',
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
  })
  findAllWatchHistory(
    @Req() req: Request,
    @Query() query: QueryWatchHistoryDto,
  ) {
    const { userId } = req?.user;
    return this.libraryService.findAllWatchHistory(query, userId);
  }

  @ApiOperation({
    summary: 'Get Video Details & Chapters',
    description: `
Fetch comprehensive details for a single video, including its chapters and the user's current watch progress.
Use this before launching the video player.
`,
  })
  @ApiResponse({
    status: 200,
    description: 'Complete video object with chapters.',
  })
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request) {
    const { userId } = req?.user as any;
    return this.libraryService.findOne(id, userId);
  }

  @ApiOperation({
    summary: 'Toggle Favorite Status',
    description: `
Marks a video as favorite or removes it from favorites if already present.
Returns the new status.
`,
  })
  @ApiResponse({
    status: 200,
    description: 'Favorite status updated.',
  })
  @Patch(':id/favorite')
  favorite(@Param('id') id: string, @Req() req: Request) {
    const { userId } = req?.user;
    return this.libraryService.favorite(id, userId);
  }

  @ApiOperation({
    summary: 'Update Playback Progress',
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
