import { Controller, Get, Post, Put, Body, Param, Delete, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { AttributeService } from './attribute.service';
import { CreateAttributeDto, CreateAttributeValueDto } from './dto/create-attribute.dto';
import { UpdateAttributeDto } from './dto/update-attribute.dto';
import { UpdateAttributeValueDto } from './dto/update-attribute-value.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AdminRoleGuard } from '../../../common/guards/admin-role.guard';

@ApiTags('Attributes')
@Controller('attributes')
export class AttributeController {
  constructor(private readonly attributeService: AttributeService) {}

  @Put('values/:valueId')
  @UseGuards(AdminRoleGuard)
  @ApiOperation({ summary: 'Update an attribute value' })
  updateValue(@Param('valueId') valueId: string, @Body() updateAttributeValueDto: UpdateAttributeValueDto) {
    return this.attributeService.updateValue(valueId, updateAttributeValueDto);
  }

  @Delete('values/:valueId')
  @UseGuards(AdminRoleGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an attribute value' })
  removeValue(@Param('valueId') valueId: string) {
    return this.attributeService.removeValue(valueId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all attributes' })
  findAll() {
    return this.attributeService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get attribute by ID' })
  findOne(@Param('id') id: string) {
    return this.attributeService.findOne(id);
  }

  @Post()
  @UseGuards(AdminRoleGuard)
  @ApiOperation({ summary: 'Create a new attribute' })
  create(@Body() createAttributeDto: CreateAttributeDto) {
    return this.attributeService.create(createAttributeDto);
  }

  @Put(':id')
  @UseGuards(AdminRoleGuard)
  @ApiOperation({ summary: 'Update an attribute' })
  update(@Param('id') id: string, @Body() updateAttributeDto: UpdateAttributeDto) {
    return this.attributeService.update(id, updateAttributeDto);
  }

  @Delete(':id')
  @UseGuards(AdminRoleGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an attribute' })
  remove(@Param('id') id: string) {
    return this.attributeService.remove(id);
  }

  @Post(':id/values')
  @UseGuards(AdminRoleGuard)
  @ApiOperation({ summary: 'Add a value to an attribute' })
  addValue(@Param('id') id: string, @Body() createAttributeValueDto: CreateAttributeValueDto) {
    return this.attributeService.createValue(id, createAttributeValueDto);
  }
}
