import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '../enums/user-role.enum';
import { NormalizeEmail } from '../../common/transforms/normalize-email.decorator';

export class CreateUserDto {
  @IsString()
  name: string;

  @NormalizeEmail()
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}
