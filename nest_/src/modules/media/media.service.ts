import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMediaDto, UpdateMediaDto } from './dto/media.dto';
import { extname } from 'path';

@Injectable()
export class MediaService {
  constructor(private prisma: PrismaService) {}

  async saveUploadedFile(file: Express.Multer.File, folderPath: string = '/') {
    const ext = extname(file.originalname).toLowerCase();
    const media = await this.prisma.media.create({
      data: {
        originalFilename: file.originalname,
        fileName: file.filename,
        filePath: file.path.replace(/\\/g, '/'), // Ensure cross-platform paths
        mimeType: file.mimetype,
        extension: ext.replace('.', ''),
        fileSize: Number(file.size),
        disk: 'local',
        fileType: file.mimetype.split('/')[0], // 'image', 'video', etc.
        folderPath: folderPath
      },
    });
    return { success: true, data: media };
  }

  async createMedia(dto: CreateMediaDto) {
    const { fileSize, ...rest } = dto;
    const media = await this.prisma.media.create({
      data: {
        ...rest,
        fileSize: Number(fileSize)
      }
    });
    return { success: true, data: media };
  }

  async getAllMedia() {
    const media = await this.prisma.media.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        variants: true,
        _count: {
          select: {
            attributeValues: true,
            brandLogos: true,
            categoryImages: true,
            productMedia: true,
            reviewImages: true,
            variantImages: true,
            beltImages: true,
            boxImages: true
          }
        }
      }
    });
    return { success: true, data: media };
  }

  async getMediaById(id: string | number) {
    const media = await this.prisma.media.findUnique({
      where: { id: Number(id) }
    });
    if (!media) {
      throw new NotFoundException(`Media with ID ${id} not found.`);
    }
    return media;
  }

  async updateMedia(id: string | number, dto: UpdateMediaDto) {
    try {
      const media = await this.prisma.media.update({
        where: { id: Number(id) },
        data: dto
      });
      return { success: true, data: media };
    } catch (error) {
      throw new NotFoundException(`Media with ID ${id} not found.`);
    }
  }

  async deleteMedia(id: string | number) {
    const media = await this.prisma.media.findUnique({
      where: { id: Number(id) }
    });

    if (!media) {
      throw new NotFoundException(`Media with ID ${id} not found.`);
    }

    try {
      // Delete from database
      await this.prisma.media.delete({
        where: { id: Number(id) }
      });

      // Try to delete from disk if it's a local file
      if (media.disk === 'local' && media.filePath) {
        const fs = require('fs');
        const path = require('path');
        const fullPath = path.join(process.cwd(), media.filePath);
        
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      }

      return { success: true, message: 'Media deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete media: ${error.message}`);
    }
  }

  async uploadMultiple(files: Array<Express.Multer.File>, category?: string, paths: string[] = []) {
    const results = await Promise.all(
      files.map((file, index) => {
        let folderPath = '/';
        if (paths[index]) {
          // Extracts the folder path from a relative file path (e.g., 'Images/1.png' -> '/Images')
          const parts = paths[index].split('/');
          if (parts.length > 1) {
            parts.pop(); // Remove the filename
            const joined = parts.join('/');
            folderPath = joined.startsWith('/') ? joined : '/' + joined;
          }
        }
        // Ensure we don't accidentally create '//' at the root
        if (folderPath.length > 1 && folderPath.startsWith('//')) {
            folderPath = folderPath.replace(/^\/+/, '/');
        }
        return this.saveUploadedFile(file, folderPath);
      })
    );
    return { success: true, data: results.map(r => r.data) };
  }

  async renameFolder(oldPath: string, newPath: string) {
    if (!oldPath || !newPath) {
      throw new Error("oldPath and newPath are required");
    }
    
    oldPath = oldPath.replace(/^\/+/, '/');
    newPath = newPath.replace(/^\/+/, '/');

    const mediaItems = await this.prisma.media.findMany({
      where: {
        OR: [
          { folderPath: oldPath },
          { folderPath: { startsWith: `${oldPath}/` } }
        ]
      }
    });

    if (mediaItems.length === 0) {
      return { success: true, message: 'Folder not found or empty', count: 0 };
    }

    let updatedCount = 0;
    for (const item of mediaItems) {
      let updatedPath = item.folderPath;
      if (item.folderPath === oldPath) {
        updatedPath = newPath;
      } else if (item.folderPath?.startsWith(`${oldPath}/`)) {
        updatedPath = newPath + item.folderPath.substring(oldPath.length);
      }

      if (updatedPath !== item.folderPath) {
        await this.prisma.media.update({
          where: { id: item.id },
          data: { folderPath: updatedPath }
        });
        updatedCount++;
      }
    }

    return { success: true, count: updatedCount };
  }

  async deleteFolder(folderPath: string) {
    if (!folderPath || folderPath === '/') {
      throw new Error("Invalid folder path");
    }
    
    folderPath = folderPath.replace(/^\/+/, '/');

    const mediaItems = await this.prisma.media.findMany({
      where: {
        OR: [
          { folderPath: folderPath },
          { folderPath: { startsWith: `${folderPath}/` } }
        ]
      }
    });

    let deletedCount = 0;
    const fs = require('fs');
    const path = require('path');

    for (const item of mediaItems) {
      await this.prisma.media.delete({
        where: { id: item.id }
      });
      
      if (item.disk === 'local' && item.filePath) {
        const fullPath = path.join(process.cwd(), item.filePath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      }
      deletedCount++;
    }

    return { success: true, count: deletedCount };
  }
}


