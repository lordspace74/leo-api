import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '../enums/user-role.enum';
import { NormalizeEmail } from '../../common/transforms/normalize-email.decorator';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  name?: string;

  @NormalizeEmail()
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}
