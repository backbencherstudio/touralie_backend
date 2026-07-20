import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Query,
} from '@nestjs/common';
import { LibraryService } from './library.service';
import { UpdateLibraryDto } from './dto/update-library.dto';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { InitVideoUploadDto } from './dto/init-video-upload.dto';
import { Roles } from '../../../common/guard/role/roles.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Role } from 'src/common/guard/role/role.enum';
import { QueryLibraryDto } from './dto/query-library.dto';
import { CreateCategoryDto } from './dto/create-category.dto';

@ApiTags('Library')
@ApiBearerAuth('admin_token')
@ApiBearerAuth('practitioner_token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.PRACTITIONER)
@Controller('admin/library')
export class LibraryController {
  constructor(private readonly libraryService: LibraryService) {}

  @ApiOperation({
    summary: 'Phase 1: Initialize media upload (Admin & Practitioner Only)',
    description:
      'Step 1 of the multi-phase upload flow. Supports VIDEO, IMAGE, and PDF files.\n\n' +
      'For **VIDEO** (`type: PRESCRIBABLE` or `type: OTHER`, `media_type: VIDEO`): An optional thumbnail can be uploaded.\n' +
      'For **IMAGE** or **PDF** (`type: OTHER`, `media_type: IMAGE` or `media_type: PDF`): Thumbnail and duration are ignored.\n\n' +
      '**Upload Steps:**\n' +
      '1. Get `upload_url` from this response.\n' +
      '2. `PUT` the file binary to `upload_url` with the correct `Content-Type`.\n' +
      '3. Call `PATCH /admin/library/{video_id}/complete-upload` to finalize.',
  })
  @ApiResponse({
    status: 201,
    description: 'Pre-signed upload URL generated',
    schema: {
      example: {
        success: true,
        message: 'Media upload initialized successfully',
        data: {
          video_id: 'cm9abc123xyz',
          upload_url: 'https://storage.example.com/presigned?token=...',
          status: 'UPLOADING',
          media_type: 'VIDEO',
          thumbnail_url: 'https://storage.example.com/thumbnails/thumb_abc.jpg',
        },
      },
    },
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('thumbnail', { storage: memoryStorage() }))
  @Post('init-upload')
  initUpload(
    @Body() initVideoUploadDto: InitVideoUploadDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 10 }), // 10MB
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg|webp)' }),
        ],
        fileIsRequired: false,
      }),
    )
    thumbnail?: Express.Multer.File,
  ) {
    return this.libraryService.initUpload(initVideoUploadDto, thumbnail);
  }

  @ApiOperation({
    summary: 'Create category (Admin & Practitioner Only)',
    description: 'Creates a new category.',
  })
  @ApiResponse({
    status: 201,
    description: 'Success - Category created',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Category created successfully' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
          },
        },
      },
    },
  })
  @Post('category')
  createCategory(@Body() createCategoryDto: CreateCategoryDto) {
    return this.libraryService.createCategory(createCategoryDto);
  }

  @ApiOperation({
    summary: 'Get all categories (Admin & Practitioner Only)',
    description: 'Returns list of all categories.',
  })
  @ApiResponse({
    status: 200,
    description: 'Success - Categories found',
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

  @ApiOperation({
    summary: 'Delete category (Admin & Practitioner Only)',
    description: 'Deletes a category.',
  })
  @ApiResponse({
    status: 200,
    description: 'Success - Category deleted',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Category deleted successfully' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
          },
        },
      },
    },
  })
  @Delete('category/:id')
  deleteCategory(@Param('id') id: string) {
    return this.libraryService.deleteCategory(id);
  }

  @ApiOperation({
    summary: 'Phase 3: Complete video upload (Admin & Practitioner Only)',
    description:
      'Step 3 of the multi-phase upload flow. Call this AFTER the frontend has successfully uploaded the video file directly to the pre-signed URL (Phase 2). This moves the video from temp storage to permanent storage and changes the status to DRAFT, enabling metadata updates.',
  })
  @ApiResponse({
    status: 200,
    description: 'Success - Video finalized and moved to permanent storage',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Video upload completed successfully',
        },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            url: { type: 'string' },
            thumbnail_url: { type: 'string' },
            status: { type: 'string', example: 'DRAFT' },
          },
        },
      },
    },
  })
  @Patch(':id/complete-upload')
  completeUpload(@Param('id') id: string) {
    return this.libraryService.completeUpload(id);
  }

  @ApiOperation({
    summary: 'Initialize video re-upload (Admin & Practitioner Only)',
    description:
      'Allows replacing existing video file. Returns new pre-signed URL.\n\n' +
      '**Steps:**\n' +
      '1. Use the `upload_url` to `PUT` the new video file.\n' +
      '2. Ensure `Content-Type` matches the file.\n' +
      '3. Call `complete-upload` after the transfer is done.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns new pre-signed URL',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Video upload re-initialized successfully',
        },
        data: {
          type: 'object',
          properties: {
            video_id: { type: 'string' },
            upload_url: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('thumbnail', { storage: memoryStorage() }))
  @Patch(':id/init-reupload')
  initReupload(
    @Param('id') id: string,
    @Body() initVideoUploadDto: InitVideoUploadDto,
  ) {
    return this.libraryService.initReupload(id, initVideoUploadDto);
  }

  @ApiOperation({
    summary: 'Get all library media (Admin & Practitioner Only)',
    description:
      'Returns paginated list of all media items (VIDEO, IMAGE, PDF). Filter by `type`, `media_type`, `status`, `category_id`, and date range.',
  })
  @ApiResponse({
    status: 200,
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
            status: 'PUBLISHED',
            media_type: 'VIDEO',
            thumbnail_url: 'https://storage.example.com/thumbnails/workout.jpg',
            category: 'Fitness',
          },
          {
            id: 'cm9img002',
            title: 'Exercise Posture Guide',
            duration: null,
            created_at: '2026-05-01T08:00:00.000Z',
            status: 'PUBLISHED',
            media_type: 'IMAGE',
            thumbnail_url: null,
            category: 'Education',
          },
          {
            id: 'cm9pdf003',
            title: 'Nutrition Handbook',
            duration: null,
            created_at: '2026-06-10T09:00:00.000Z',
            status: 'DRAFT',
            media_type: 'PDF',
            thumbnail_url: null,
            category: 'Nutrition',
          },
        ],
        meta_data: {
          page: 1,
          limit: 10,
          total: 3,
          search: null,
          filters: {
            type: null,
            status: 'ALL',
            category_id: null,
            start_date: null,
            end_date: null,
            media_type: null,
          },
        },
      },
    },
  })
  @Get()
  findAll(@Query() query: QueryLibraryDto) {
    return this.libraryService.findAll(query);
  }

  @ApiOperation({
    summary: 'Get single media item by ID (Admin & Practitioner Only)',
    description:
      'Returns full details for a media item. `duration` and `thumbnail_url` are `null` for IMAGE and PDF types.',
  })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        success: true,
        message: 'Video found successfully',
        data: {
          id: 'cm9vid001',
          title: 'Full Body Workout',
          description: 'A comprehensive 30-min workout session.',
          duration: 1800,
          url: 'https://storage.example.com/videos/workout.mp4',
          thumbnail_url: 'https://storage.example.com/thumbnails/workout.jpg',
          type: 'OTHER',
          visibility: 'PUBLIC',
          media_type: 'VIDEO',
          status: 'PUBLISHED',
          users: [
            {
              id: 'usr001',
              name: 'Jane Doe',
              email: 'jane@example.com',
              gender: 'female',
              date_of_birth: '1990-01-01',
            },
          ],
          category: { id: 'cat001', title: 'Fitness' },
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Example for IMAGE type',
    schema: {
      example: {
        success: true,
        message: 'Video found successfully',
        data: {
          id: 'cm9img002',
          title: 'Exercise Posture Guide',
          description: 'Visual reference for correct posture.',
          duration: null,
          url: 'https://storage.example.com/media/posture_guide.png',
          thumbnail_url: null,
          type: 'OTHER',
          visibility: 'LISTED',
          media_type: 'IMAGE',
          status: 'PUBLISHED',
          users: [{ id: 'usr002', name: 'John Smith', email: 'john@example.com', gender: 'male', date_of_birth: '1985-05-10' }],
          category: { id: 'cat002', title: 'Education' },
        },
      },
    },
  })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.libraryService.findOne(id);
  }

  @ApiOperation({
    summary: 'Update video metadata (Admin & Practitioner Only)',
    description:
      'Allows updating title, description, category, and level. This is ONLY permitted if the video status is NOT UPLOADING. Thumbnail is updated via multipart file upload.',
  })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Video updated successfully' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            url: { type: 'string' },
            thumbnail_url: { type: 'string' },
            type: { type: 'string' },
            visibility: { type: 'string' },
            users: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  email: { type: 'string' },
                  gender: { type: 'string' },
                  date_of_birth: { type: 'string' },
                },
              },
            },
            status: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: {
          type: 'string',
          example: 'Forbidden - Cannot update while status is UPLOADING',
        },
      },
    },
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('thumbnail', { storage: memoryStorage() }))
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateLibraryDto: UpdateLibraryDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 10 }), // 10MB
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg|webp)' }),
        ],
        fileIsRequired: false,
      }),
    )
    thumbnail?: Express.Multer.File,
  ) {
    return this.libraryService.update(id, updateLibraryDto, thumbnail);
  }

  @ApiOperation({
    summary: 'Delete video (Admin & Practitioner Only)',
    description: 'Deletes video and associated chapters.',
  })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Video deleted successfully' },
        data: { type: 'object' },
      },
    },
  })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.libraryService.remove(id);
  }

  // @ApiOperation({
  //   summary: 'Add chapter to video (Admin & Practitioner Only)',
  //   description:
  //     'Adds a new time-mark chapter. Requires start_time and end_time. Thumbnails are uploaded as files. Overlap with existing chapters is validated.',
  // })
  // @ApiResponse({
  //   status: 201,
  //   schema: {
  //     type: 'object',
  //     properties: {
  //       success: { type: 'boolean', example: true },
  //       message: { type: 'string', example: 'Chapter added successfully' },
  //       data: { type: 'object' },
  //     },
  //   },
  // })
  // @ApiResponse({
  //   status: 400,
  //   schema: {
  //     type: 'object',
  //     properties: {
  //       success: { type: 'boolean', example: false },
  //       message: {
  //         type: 'string',
  //         example: 'Bad Request - Validation or Overlap error',
  //       },
  //     },
  //   },
  // })
  // @ApiConsumes('multipart/form-data')
  // @UseInterceptors(FileInterceptor('thumbnail', { storage: memoryStorage() }))
  // @Post(':id/chapters')
  // addChapter(
  //   @Param('id') id: string,
  //   @Body() chapterData: CreateChapterDto,
  //   @UploadedFile(
  //     new ParseFilePipe({
  //       validators: [
  //         new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 10 }), // 10MB
  //         new FileTypeValidator({ fileType: '.(png|jpeg|jpg|webp)' }),
  //       ],
  //       fileIsRequired: false,
  //     }),
  //   )
  //   thumbnail?: Express.Multer.File,
  // ) {
  //   return this.libraryService.addChapter(id, chapterData, thumbnail);
  // }

  // @ApiOperation({
  //   summary: 'Get chapters of a video (Admin & Practitioner Only)',
  //   description: 'Returns list of chapters sorted by start time.',
  // })
  // @ApiResponse({
  //   status: 200,
  //   schema: {
  //     type: 'object',
  //     properties: {
  //       success: { type: 'boolean', example: true },
  //       message: { type: 'string', example: 'Chapters fetched successfully' },
  //       data: {
  //         type: 'array',
  //         items: {
  //           type: 'object',
  //           properties: {
  //             id: { type: 'string' },
  //             title: { type: 'string' },
  //             start_time: { type: 'string' },
  //             end_time: { type: 'string' },
  //             thumbnail_url: { type: 'string' },
  //           },
  //         },
  //       },
  //     },
  //   },
  // })
  // @Get(':id/chapters')
  // getChapters(@Param('id') id: string) {
  //   return this.libraryService.getChapters(id);
  // }

  // @ApiOperation({
  //   summary: 'Update chapter (Admin & Practitioner Only)',
  //   description: 'Updates chapter metadata or thumbnail file.',
  // })
  // @ApiResponse({
  //   status: 200,
  //   schema: {
  //     type: 'object',
  //     properties: {
  //       success: { type: 'boolean', example: true },
  //       message: { type: 'string', example: 'Chapter updated successfully' },
  //       data: { type: 'object' },
  //     },
  //   },
  // })
  // @ApiResponse({
  //   status: 400,
  //   schema: {
  //     type: 'object',
  //     properties: {
  //       success: { type: 'boolean', example: false },
  //       message: {
  //         type: 'string',
  //         example: 'Bad Request - Validation or Overlap error',
  //       },
  //     },
  //   },
  // })
  // @ApiConsumes('multipart/form-data')
  // @UseInterceptors(FileInterceptor('thumbnail', { storage: memoryStorage() }))
  // @Patch('chapters/:chapterId')
  // updateChapter(
  //   @Param('chapterId') chapterId: string,
  //   @Body() chapterData: UpdateChapterDtoLocal,
  //   @UploadedFile(
  //     new ParseFilePipe({
  //       validators: [
  //         new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 10 }), // 10MB
  //         new FileTypeValidator({ fileType: '.(png|jpeg|jpg|webp)' }),
  //       ],
  //       fileIsRequired: false,
  //     }),
  //   )
  //   thumbnail?: Express.Multer.File,
  // ) {
  //   return this.libraryService.updateChapter(chapterId, chapterData, thumbnail);
  // }

  // @ApiOperation({
  //   summary: 'Remove chapter (Admin & Practitioner Only)',
  //   description: 'Permanently deletes a specific chapter.',
  // })
  // @ApiResponse({
  //   status: 200,
  //   schema: {
  //     type: 'object',
  //     properties: {
  //       success: { type: 'boolean', example: true },
  //       message: { type: 'string', example: 'Chapter deleted successfully' },
  //       data: { type: 'object' },
  //     },
  //   },
  // })
  // @Delete('chapters/:chapterId')
  // removeChapter(@Param('chapterId') chapterId: string) {
  //   return this.libraryService.removeChapter(chapterId);
  // }
}
