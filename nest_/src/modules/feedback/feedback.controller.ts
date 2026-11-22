import { Controller, Get, Post, Body, Param, Patch, UseGuards } from '@nestjs/common';
import { ReviewService } from './review.service';
import { SubmitReviewDto, UpdateReviewStatusDto } from './dto/review.dto';
import { AdminRoleGuard } from '../../common/guards/admin-role.guard';

@Controller('reviews')
export class FeedbackController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get()
  @UseGuards(AdminRoleGuard)
  async getAllReviews() {
    return this.reviewService.getAllReviews();
  }

  @Post()
  async submitReview(@Body() dto: SubmitReviewDto, @Body('userId') userId: string) {
    return this.reviewService.submitReview(userId, dto);
  }

  @Get('product/:id')
  async getProductReviews(@Param('id') productId: string) {
    return this.reviewService.getProductReviews(productId);
  }

  @Patch(':id/status')
  @UseGuards(AdminRoleGuard)
  async updateReviewStatus(@Param('id') reviewId: string, @Body() dto: UpdateReviewStatusDto) {
    return this.reviewService.updateReviewStatus(reviewId, dto.status);
  }

  @Post(':id/vote')
  async voteReview(@Param('id') reviewId: string, @Body('type') type: 'helpful' | 'not_helpful') {
    return this.reviewService.voteReview(reviewId, type);
  }
}
