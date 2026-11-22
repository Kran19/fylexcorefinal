import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
  UploadedFiles,
  UseGuards,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductFilterDto } from './dto/product-filter.dto';
import { VariantGeneratorService } from './variant-generator.service';
import { AdminRoleGuard } from '../../common/guards/admin-role.guard';
import { createSafeDiskStorage, safeMediaFileFilter } from '../../common/utils/upload-filter';

@Controller('products')
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    private readonly variantGenerator: VariantGeneratorService,
  ) {}

  @Post()
  @UseGuards(AdminRoleGuard)
  @UseInterceptors(
    FilesInterceptor('images', 20, {
      fileFilter: safeMediaFileFilter,
      storage: createSafeDiskStorage('./uploads'),
    }),
  )
  create(@Body() createProductDto: CreateProductDto, @UploadedFiles() images?: Array<Express.Multer.File>) {
    return this.productService.createProduct(createProductDto, images);
  }

  @Get()
  findAll(@Query() filters: ProductFilterDto) {
    return this.productService.getAllProducts(filters);
  }

  @Post('reorder')
  @UseGuards(AdminRoleGuard)
  async reorder(@Body('ids') ids: (number | string)[]) {
    return this.productService.reorderProducts(ids);
  }

  @Get('featured')
  async getFeatured() {
    return this.productService.getFeaturedProducts();
  }

  @Get('inventory')
  @UseGuards(AdminRoleGuard)
  async getInventory() {
    return this.productService.getInventory();
  }

  @Patch('inventory/:id')
  @UseGuards(AdminRoleGuard)
  async updateInventory(
    @Param('id') id: string,
    @Body() body: { qty: number; type: string; note?: string; adminId?: string },
  ) {
    return this.productService.updateInventoryStock(id, body.qty, body.type, body.note, body.adminId);
  }

  @Get(':idOrSlug')
  findOne(@Param('idOrSlug') idOrSlug: string) {
    return this.productService.getProductById(idOrSlug);
  }

  @Get('by-category/:slug')
  async findByCategory(@Param('slug') slug: string, @Query() filters: ProductFilterDto) {
    return this.productService.getProductsByCategory(slug, filters);
  }

  @Put(':id')
  @UseGuards(AdminRoleGuard)
  @UseInterceptors(
    FilesInterceptor('images', 20, {
      fileFilter: safeMediaFileFilter,
      storage: createSafeDiskStorage('./uploads'),
    }),
  )
  update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @UploadedFiles() images?: Array<Express.Multer.File>,
  ) {
    return this.productService.updateProduct(id, updateProductDto, images);
  }

  @Delete(':id')
  @UseGuards(AdminRoleGuard)
  remove(@Param('id') id: string) {
    return this.productService.deleteProduct(id);
  }

  @Post(':id/generate-variants')
  @UseGuards(AdminRoleGuard)
  async generateVariants(@Param('id') id: string, @Body() body: { selections: any[] }) {
    const product = await this.productService.getProductById(id);
    const selections = (body.selections || []).map((s) => ({
      attributeId: Number(s.attributeId),
      valueIds: (s.valueIds || s.attributeValueIds || []).map((vId) => Number(vId)),
    }));

    const result = await this.variantGenerator.generateVariants(
      Number(product.id),
      selections,
      product.productCode || 'PROD',
    );
    this.productService.invalidateProductCache();
    return result;
  }

  @Get(':id/variants')
  async getVariants(@Param('id') id: string) {
    return this.productService.getProductVariants(id);
  }

  @Post(':id/media/360')
  @UseGuards(AdminRoleGuard)
  @UseInterceptors(
    FilesInterceptor('images', 100, {
      fileFilter: safeMediaFileFilter,
      storage: createSafeDiskStorage('./uploads'),
    }),
  )
  async upload360Media(@Param('id') id: string, @UploadedFiles() files: Array<Express.Multer.File>) {
    return this.productService.uploadProductMedia(id, files, '360');
  }
}

@Controller('variants')
export class VariantController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  async getAllVariants(@Query('page') page: string = '1', @Query('limit') limit: string = '50') {
    return this.productService.getAllVariants(Number(page), Math.min(200, Number(limit) || 50));
  }

  @Get(':id')
  async getVariantById(@Param('id') id: string) {
    return this.productService.getVariantById(id);
  }

  @Patch(':id')
  @UseGuards(AdminRoleGuard)
  async updateVariant(@Param('id') id: string, @Body() body: any) {
    return this.productService.updateVariant(id, body);
  }

  @Post(':id/media')
  @UseGuards(AdminRoleGuard)
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      fileFilter: safeMediaFileFilter,
      storage: createSafeDiskStorage('./uploads'),
    }),
  )
  async uploadVariantMedia(
    @Param('id') id: string,
    @Body('type') type: string,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    return this.productService.uploadVariantMedia(id, files, type);
  }
}
