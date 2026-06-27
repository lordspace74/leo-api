import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../enums/user-role.enum';
import { NormalizeEmail } from '../../common/transforms/normalize-email.decorator';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Alice' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ format: 'email', example: 'alice@example.com' })
  @NormalizeEmail()
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    format: 'password',
    minLength: 6,
    example: 'password',
  })
  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({ enum: UserRole })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}
