import { Controller, Get, Post, Param, UploadedFiles, UseInterceptors, Delete, Body, Put } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { MediaService } from './media.service';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get()
  async getAllMedia() {
    return this.mediaService.getAllMedia();
  }

  @Post('upload')
  @UseInterceptors(FilesInterceptor('file', 500, {
    limits: { fileSize: 20 * 1024 * 1024 },
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
        cb(null, `${randomName}${extname(file.originalname)}`);
      },
    }),
  }))
  async uploadMedia(
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Param('category') category?: string,
    @Body('paths') pathsStr?: string
  ) {
    let paths: string[] = [];
    if (pathsStr) {
      try {
        paths = JSON.parse(pathsStr);
      } catch {
        paths = [];
      }
    }
    return this.mediaService.uploadMultiple(files, category, paths);
  }

  @Delete('folder')
  async deleteFolder(@Body('folderPath') folderPath: string) {
    return this.mediaService.deleteFolder(folderPath);
  }

  @Post('folder/rename')
  async renameFolder(
    @Body('oldPath') oldPath: string,
    @Body('newPath') newPath: string
  ) {
    return this.mediaService.renameFolder(oldPath, newPath);
  }

  @Put(':id')
  async updateMedia(
    @Param('id') id: string,
    @Body() dto: any
  ) {
    return this.mediaService.updateMedia(id, dto);
  }

  @Delete(':id')
  async deleteMedia(@Param('id') id: string) {
    return this.mediaService.deleteMedia(id);
  }
}


