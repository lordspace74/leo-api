import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../enums/user-role.enum';
import { NormalizeEmail } from '../../common/transforms/normalize-email.decorator';

export class CreateUserDto {
  @ApiProperty({ example: 'Alice' })
  @IsString()
  name: string;

  @ApiProperty({ format: 'email', example: 'alice@example.com' })
  @NormalizeEmail()
  @IsEmail()
  email: string;

  @ApiProperty({ format: 'password', minLength: 6, example: 'password' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ enum: UserRole, default: UserRole.USER })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}
