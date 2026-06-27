import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBody,
  ApiExtraModels,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JsonApiInterceptor } from '../common/interceptors/json-api.interceptor';
import { EtagInterceptor } from '../common/interceptors/etag.interceptor';
import { JsonApiRequestInterceptor } from '../common/interceptors/json-api-request.interceptor';
import {
  JsonApiDocument,
  toResource,
} from '../common/serializers/json-api.serializer';
import {
  ApiJsonApiBody,
  ApiJsonApiError,
  ApiJsonApiResponse,
  ETAG_RESPONSE_HEADERS,
  JSON_API_MODELS,
  jsonApiResourceSchema,
  UserResourceAttributes,
} from '../common/openapi/json-api.openapi';

@ApiTags('auth')
@ApiExtraModels(...JSON_API_MODELS, RegisterDto, LoginDto)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @UseInterceptors(
    new JsonApiRequestInterceptor('users'),
    new JsonApiInterceptor('users'),
    new EtagInterceptor(),
  )
  @ApiOperation({ summary: 'Register a new USER account' })
  @ApiJsonApiBody('users', RegisterDto)
  @ApiJsonApiResponse(
    201,
    jsonApiResourceSchema('users', UserResourceAttributes),
    'The created user',
    ETAG_RESPONSE_HEADERS,
  )
  @ApiJsonApiError(400, 'Malformed body or invalid attributes')
  @ApiJsonApiError(409, 'Wrong resource type or duplicate email')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in and receive an access token' })
  @ApiBody({
    type: LoginDto,
    description: 'Plain credentials (not a JSON:API document)',
  })
  @ApiJsonApiResponse(
    200,
    jsonApiResourceSchema('users', UserResourceAttributes, {
      type: 'object',
      properties: { access_token: { type: 'string' } },
    }),
    'The authenticated user with an access token in `meta`',
  )
  @ApiJsonApiError(401, 'Invalid credentials')
  async login(@Body() dto: LoginDto): Promise<JsonApiDocument> {
    const { user, accessToken } = await this.authService.login(dto);
    return {
      data: toResource(user, 'users'),
      meta: { access_token: accessToken },
    };
  }
}
