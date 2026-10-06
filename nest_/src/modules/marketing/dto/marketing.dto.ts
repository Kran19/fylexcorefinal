import { IsNotEmpty, IsString, IsOptional, IsNumber, IsArray, Min } from 'class-validator';

export class ValidateCouponDto {
  @IsNotEmpty()
  @IsString()
  code: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  cartAmount: number;

  @IsOptional()
  @IsArray()
  items?: any[];
}

export class ApplyCouponDto {
  @IsNotEmpty()
  @IsString()
  code: string;
}

export class SpendPointsDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  points: number;
}


