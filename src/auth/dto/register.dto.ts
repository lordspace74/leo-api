import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { NormalizeEmail } from '../../common/transforms/normalize-email.decorator';

export class RegisterDto {
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
}
