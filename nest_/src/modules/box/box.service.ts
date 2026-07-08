import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BoxService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.box.findMany({
      orderBy: { createdAt: 'desc' },
      include: { image: true },
    });
  }

  async findOne(id: number) {
    const box = await this.prisma.box.findUnique({
      where: { id },
      include: { image: true },
    });
    if (!box) {
      throw new NotFoundException(`Box with ID ${id} not found`);
    }
    return box;
  }

  async create(data: any) {
    return this.prisma.box.create({
      data: {
        name: data.name,
        isActive: data.isActive !== undefined ? data.isActive : true,
        imageId: data.imageId || null,
      },
    });
  }

  async update(id: number, data: any) {
    await this.findOne(id); // Ensure it exists
    return this.prisma.box.update({
      where: { id },
      data: {
        name: data.name,
        isActive: data.isActive,
        imageId: data.imageId !== undefined ? data.imageId : undefined,
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id); // Ensure it exists
    return this.prisma.box.delete({
      where: { id },
    });
  }
}
