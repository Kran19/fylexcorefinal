import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateAttributeDto, CreateAttributeValueDto } from './dto/create-attribute.dto';
import { UpdateAttributeDto } from './dto/update-attribute.dto';
import { UpdateAttributeValueDto } from './dto/update-attribute-value.dto';

@Injectable()
export class AttributeService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    try {
      const attributes = await this.prisma.attribute.findMany({
        include: {
          values: {
            orderBy: {
              sortOrder: 'asc',
            },
          },
        },
        orderBy: {
          sortOrder: 'asc',
        },
      });

      const mapped = attributes.map(attr => ({
        ...attr,
        isActive: attr.status === 'active' || attr.status === '1',
      }));

      return {
        success: true,
        data: mapped,
      };
    } catch (error) {
      console.error('AttributeService.findAll Error:', error);
      throw new BadRequestException('Failed to fetch attributes');
    }
  }

  async findOne(id: number | string) {
    try {
      const attribute = await this.prisma.attribute.findUnique({
        where: { id: Number(id) },
        include: {
          values: {
            orderBy: {
              sortOrder: 'asc',
            },
          },
        },
      });

      if (!attribute) {
        throw new NotFoundException(`Attribute with ID ${id} not found.`);
      }

      return {
        success: true,
        data: {
          ...attribute,
          isActive: attribute.status === 'active' || attribute.status === '1',
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('AttributeService.findOne Error:', error);
      throw new BadRequestException('Failed to fetch attribute');
    }
  }

  private async syncIdSequences() {
    try {
      await this.prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('attributes', 'id'), COALESCE((SELECT MAX(id) FROM attributes), 1));`);
      await this.prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('attribute_values', 'id'), COALESCE((SELECT MAX(id) FROM attribute_values), 1));`);
    } catch (e) {
      // Non-fatal sequence sync fallback
    }
  }

  async create(createAttributeDto: CreateAttributeDto) {
    try {
      // Sync sequence before creating to prevent ID sequence collision after seeding
      await this.syncIdSequences();

      const { values, isActive, ...rest } = createAttributeDto;
      
      let code = rest.code || (rest.name ? rest.name.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') : `attr_${Date.now()}`);
      if (!code) code = `attr_${Date.now()}`;

      // Handle code collisions gracefully
      const existing = await this.prisma.attribute.findUnique({ where: { code } });
      if (existing) {
        code = `${code}_${Date.now().toString().slice(-4)}`;
      }

      const attribute = await this.prisma.attribute.create({
        data: {
          name: rest.name,
          code,
          type: rest.type || 'text',
          isVariant: rest.isVariant !== undefined ? Boolean(rest.isVariant) : true,
          isFilterable: rest.isFilterable !== undefined ? Boolean(rest.isFilterable) : true,
          status: createAttributeDto.status || (isActive === false ? 'inactive' : 'active'),
          sortOrder: rest.sortOrder ? Number(rest.sortOrder) : 0,
          values: values && values.length > 0 ? {
            create: values.map((val, idx) => ({
              value: val.value || val.label || 'Value',
              label: val.label || val.value || 'Option',
              colorCode: val.colorCode || null,
              status: val.status || 'active',
              sortOrder: val.sortOrder !== undefined ? Number(val.sortOrder) : idx,
              imageId: val.imageId && !isNaN(Number(val.imageId)) && Number(val.imageId) > 0 ? Number(val.imageId) : null,
            })),
          } : undefined,
        },
        include: {
          values: true,
        },
      });

      return {
        success: true,
        data: {
          ...attribute,
          isActive: attribute.status === 'active',
        },
      };
    } catch (error) {
      console.error('AttributeService.create Error:', error);
      throw new BadRequestException(error.message || 'Failed to create attribute');
    }
  }

  async update(id: number | string, updateAttributeDto: UpdateAttributeDto) {
    try {
      const { values, isActive, ...rest } = updateAttributeDto as any;

      const attribute = await this.prisma.attribute.update({
        where: { id: Number(id) },
        data: {
          ...(rest.name ? { name: rest.name } : {}),
          ...(rest.code ? { code: rest.code } : {}),
          ...(rest.type ? { type: rest.type } : {}),
          ...(rest.isVariant !== undefined ? { isVariant: Boolean(rest.isVariant) } : {}),
          ...(rest.isFilterable !== undefined ? { isFilterable: Boolean(rest.isFilterable) } : {}),
          ...(rest.sortOrder !== undefined ? { sortOrder: Number(rest.sortOrder) } : {}),
          ...(isActive !== undefined ? { status: isActive ? 'active' : 'inactive' } : (rest.status ? { status: rest.status } : {})),
        },
        include: {
          values: true,
        },
      });

      return {
        success: true,
        data: {
          ...attribute,
          isActive: attribute.status === 'active',
        },
      };
    } catch (error) {
      console.error('AttributeService.update Error:', error);
      throw new BadRequestException(error.message || 'Failed to update attribute');
    }
  }

  async remove(id: number | string) {
    try {
      await this.prisma.attribute.delete({
        where: { id: Number(id) },
      });

      return {
        success: true,
        message: 'Attribute deleted successfully',
      };
    } catch (error) {
      console.error('AttributeService.remove Error:', error);
      throw new BadRequestException(error.message || 'Failed to delete attribute');
    }
  }

  // --- Attribute Value Methods ---

  async createValue(attributeId: number | string, dto: CreateAttributeValueDto) {
    try {
      await this.syncIdSequences();
      const attrId = Number(attributeId);
      const imgId = dto.imageId && !isNaN(Number(dto.imageId)) && Number(dto.imageId) > 0 ? Number(dto.imageId) : null;
      
      const valLabel = dto.label || dto.value || 'Option';
      const valText = dto.value || dto.label || 'Option';

      const value = await this.prisma.attributeValue.create({
        data: {
          attributeId: attrId,
          value: valText,
          label: valLabel,
          code: valText.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
          colorCode: dto.colorCode || null,
          status: dto.status || 'active',
          sortOrder: dto.sortOrder !== undefined ? Number(dto.sortOrder) : 0,
          imageId: imgId,
        },
      });

      return {
        success: true,
        data: value,
      };
    } catch (error) {
      console.error('AttributeService.createValue Error:', error);
      throw new BadRequestException(error.message || 'Failed to create attribute option value');
    }
  }

  async updateValue(valueId: number | string, dto: UpdateAttributeValueDto) {
    try {
      const { imageId, label, value, colorCode, status, sortOrder } = dto as any;
      const imgId = imageId !== undefined ? (imageId && !isNaN(Number(imageId)) && Number(imageId) > 0 ? Number(imageId) : null) : undefined;

      const data: any = {};
      if (label !== undefined) data.label = label;
      if (value !== undefined) data.value = value;
      if (colorCode !== undefined) data.colorCode = colorCode || null;
      if (status !== undefined) data.status = status;
      if (sortOrder !== undefined) data.sortOrder = Number(sortOrder);
      if (imgId !== undefined) data.imageId = imgId;

      const updatedValue = await this.prisma.attributeValue.update({
        where: { id: Number(valueId) },
        data,
      });

      return {
        success: true,
        data: updatedValue,
      };
    } catch (error) {
      console.error('AttributeService.updateValue Error:', error);
      throw new BadRequestException(error.message || 'Failed to update attribute option value');
    }
  }

  async removeValue(valueId: number | string) {
    try {
      await this.prisma.attributeValue.delete({
        where: { id: Number(valueId) },
      });

      return {
        success: true,
        message: 'Attribute value deleted successfully',
      };
    } catch (error) {
      console.error('AttributeService.removeValue Error:', error);
      throw new BadRequestException(error.message || 'Failed to delete attribute option value');
    }
  }
}
