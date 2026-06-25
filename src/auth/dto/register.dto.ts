import { IsEmail, IsString, MinLength } from 'class-validator';
import { NormalizeEmail } from '../../common/transforms/normalize-email.decorator';

export class RegisterDto {
  @IsString()
  name: string;

  @NormalizeEmail()
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}
