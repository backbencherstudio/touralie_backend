import {
  Controller,
  Get,
  HttpStatus,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { AppService } from './app.service';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { createReadStream } from 'fs';
import { join } from 'path';
import { Response } from 'express';
import { Readable } from 'stream';
import { ApiExcludeController } from '@nestjs/swagger';

@ApiExcludeController()
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('test-chunk-stream')
  async chunkStream(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');
    res.flushHeaders(); // make sure headers are sent immediately

    const stream = new Readable({
      read() {},
    });

    // Pipe the stream to the response
    stream.pipe(res);

    let counter = 0;
    const interval = setInterval(() => {
      if (counter >= 10) {
        stream.push('Stream complete.\n');
        stream.push(null); // ends the stream
        clearInterval(interval);
      } else {
        stream.push(`Chunk ${counter + 1} at ${new Date().toISOString()}\n`);
        counter++;
      }
    }, 500);
  }

  @Get('test-file-stream')
  testFileStream(@Res({ passthrough: true }) res: Response) {
    const file = createReadStream(join(process.cwd(), 'package.json'));
    return new StreamableFile(file, {
      type: 'application/json',
      disposition: 'attachment; filename="package.json"',
    });
  }

  @Post('test-file-upload')
  @UseInterceptors(
    FileInterceptor('image', { storage: multer.memoryStorage() as any }),
  )
  async test(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 10 }), // 10MB
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg|webp)' }),
        ],
        fileIsRequired: false,
      }),
    )
    image?: Express.Multer.File,
  ) {
    try {
      const result = await this.appService.test(image);
      return result;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Post('test-video-upload')
  @UseInterceptors(
    FileInterceptor('video', { storage: multer.memoryStorage() as any }),
  )
  async testVideo(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 1024 * 10 }), // 10GB
          new FileTypeValidator({ fileType: '.(mp4|mkv|avi|mov)' }),
        ],
        fileIsRequired: false,
      }),
    )
    video?: Express.Multer.File,
  ) {
    try {
      const result = await this.appService.test(video);
      return result;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
