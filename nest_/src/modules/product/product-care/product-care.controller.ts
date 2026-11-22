import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards } from '@nestjs/common';
import { ProductCareService } from './product-care.service';
import { AdminRoleGuard } from '../../../common/guards/admin-role.guard';

@Controller('product-care')
export class ProductCareController {
  constructor(private readonly productCareService: ProductCareService) {}

  @Post()
  @UseGuards(AdminRoleGuard)
  create(@Body() createProductCareDto: any) {
    return this.productCareService.create(createProductCareDto);
  }

  @Get('grouped')
  findAllProductsWithSteps() {
    return this.productCareService.findAllProductsWithSteps();
  }

  @Get('product/:productId')
  findByProduct(@Param('productId') productId: string) {
    return this.productCareService.findByProduct(+productId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productCareService.findOne(+id);
  }

  @Put(':id')
  @UseGuards(AdminRoleGuard)
  update(@Param('id') id: string, @Body() updateProductCareDto: any) {
    return this.productCareService.update(+id, updateProductCareDto);
  }

  @Delete(':id')
  @UseGuards(AdminRoleGuard)
  remove(@Param('id') id: string) {
    return this.productCareService.remove(+id);
  }
}
