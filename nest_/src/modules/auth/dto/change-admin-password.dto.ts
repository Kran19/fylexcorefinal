import { IsNotEmpty, MinLength } from 'class-validator';

export class ChangeAdminPasswordDto {
  @IsNotEmpty({ message: 'Current password is required' })
  currentPassword: string;

  @IsNotEmpty({ message: 'New password is required' })
  @MinLength(6, { message: 'New password must be at least 6 characters long' })
  newPassword: string;

  @IsNotEmpty({ message: 'Confirm password is required' })
  confirmPassword: string;
}
