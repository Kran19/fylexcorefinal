import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { AdminRoleGuard } from '../../common/guards/admin-role.guard';

@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @UseGuards(AdminRoleGuard)
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoryService.createCategory(createCategoryDto);
  }

  @Get()
  findAll() {
    return this.categoryService.getAllCategories();
  }

  @Get('tree')
  findTree() {
    return this.categoryService.getCategoryTree();
  }

  @Get(':idOrSlug')
  findOne(@Param('idOrSlug') idOrSlug: string) {
    const isId = /^\d+$/.test(idOrSlug);
    if (isId) {
      return this.categoryService.getCategoryById(idOrSlug);
    }
    return this.categoryService.getCategoryBySlug(idOrSlug);
  }

  @Put(':id')
  @UseGuards(AdminRoleGuard)
  update(@Param('id') id: string, @Body() updateCategoryDto: UpdateCategoryDto) {
    return this.categoryService.updateCategory(id, updateCategoryDto);
  }

  @Delete(':id')
  @UseGuards(AdminRoleGuard)
  remove(@Param('id') id: string) {
    return this.categoryService.deleteCategory(id);
  }
}
