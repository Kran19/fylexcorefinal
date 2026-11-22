import { Controller, Get, Post, Put, Body, Param, Delete, UseGuards } from '@nestjs/common';
import { TagService } from './tag.service';
import { CreateTagDto, UpdateTagDto } from './dto/tag.dto';
import { AdminRoleGuard } from '../../common/guards/admin-role.guard';

@Controller('tags')
export class TagController {
  constructor(private readonly tagService: TagService) {}

  @Post()
  @UseGuards(AdminRoleGuard)
  create(@Body() createTagDto: CreateTagDto) {
    return this.tagService.createTag(createTagDto);
  }

  @Get()
  findAll() {
    return this.tagService.getAllTags();
  }

  @Get(':idOrSlug')
  findOne(@Param('idOrSlug') idOrSlug: string) {
    const isId = /^\d+$/.test(idOrSlug);
    if (isId) {
      return this.tagService.getTagById(idOrSlug);
    }
    return this.tagService.getTagBySlug(idOrSlug);
  }

  @Put(':id')
  @UseGuards(AdminRoleGuard)
  update(@Param('id') id: string, @Body() updateTagDto: UpdateTagDto) {
    return this.tagService.updateTag(id, updateTagDto);
  }

  @Delete(':id')
  @UseGuards(AdminRoleGuard)
  remove(@Param('id') id: string) {
    return this.tagService.deleteTag(id);
  }
}
