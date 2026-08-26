import { IsNotEmpty, IsString, Length } from 'class-validator';

export class LoginOtpDto {
  @IsNotEmpty()
  @IsString()
  mobile: string;

  @IsNotEmpty()
  @IsString()
  @Length(4, 8)
  otp: string;
}


