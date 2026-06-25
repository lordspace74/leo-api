import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JsonApiInterceptor } from '../common/interceptors/json-api.interceptor';
import { JsonApiRequestInterceptor } from '../common/interceptors/json-api-request.interceptor';
import {
  JsonApiDocument,
  toResource,
} from '../common/serializers/json-api.serializer';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @UseInterceptors(
    new JsonApiRequestInterceptor('users'),
    new JsonApiInterceptor('users'),
  )
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto): Promise<JsonApiDocument> {
    const { user, accessToken } = await this.authService.login(dto);
    return {
      data: toResource(user, 'users'),
      meta: { access_token: accessToken },
    };
  }
}
