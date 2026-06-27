import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  ParseUUIDPipe,
  Body,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiNoContentResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  PageParamsDto,
  PaginationQueryDto,
} from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { IfMatch } from '../common/decorators/if-match.decorator';
import { JsonApiInterceptor } from '../common/interceptors/json-api.interceptor';
import { EtagInterceptor } from '../common/interceptors/etag.interceptor';
import { JsonApiRequestInterceptor } from '../common/interceptors/json-api-request.interceptor';
import {
  JsonApiDocument,
  toCollection,
} from '../common/serializers/json-api.serializer';
import {
  ApiIfMatchHeader,
  ApiIfNoneMatchHeader,
  ApiJsonApiBody,
  ApiJsonApiError,
  ApiJsonApiResponse,
  ApiNotModifiedResponse,
  ETAG_RESPONSE_HEADERS,
  JSON_API_MODELS,
  jsonApiCollectionSchema,
  jsonApiResourceSchema,
  UserResourceAttributes,
} from '../common/openapi/json-api.openapi';
import { UserRole } from './enums/user-role.enum';
import { User } from './entities/user.entity';

const DEFAULT_PAGE = 1;
const DEFAULT_SIZE = 20;

@ApiTags('users')
@ApiBearerAuth()
@ApiExtraModels(...JSON_API_MODELS, CreateUserDto, UpdateUserDto)
@ApiJsonApiError(401, 'Missing or invalid access token')
@ApiJsonApiError(403, 'The authenticated user may not perform this action')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(new JsonApiInterceptor('users'), new EtagInterceptor())
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List users (ADMIN only)' })
  @ApiQuery({
    name: 'page',
    required: false,
    style: 'deepObject',
    explode: true,
    description:
      'JSON:API page-based pagination, e.g. `page[number]=1&page[size]=20`',
    schema: { $ref: getSchemaPath(PageParamsDto) },
  })
  @ApiJsonApiResponse(
    200,
    jsonApiCollectionSchema('users', UserResourceAttributes),
    'A paginated collection of users',
  )
  @ApiJsonApiError(400, 'Invalid pagination parameters')
  async findAll(@Query() query: PaginationQueryDto): Promise<JsonApiDocument> {
    const page = query.page?.number ?? DEFAULT_PAGE;
    const size = query.page?.size ?? DEFAULT_SIZE;
    const result = await this.usersService.findAll(page, size);
    return toCollection(result, 'users', '/users');
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(new JsonApiRequestInterceptor('users'))
  @ApiOperation({ summary: 'Create a user (ADMIN only)' })
  @ApiJsonApiBody('users', CreateUserDto)
  @ApiJsonApiResponse(
    201,
    jsonApiResourceSchema('users', UserResourceAttributes),
    'The created user',
    ETAG_RESPONSE_HEADERS,
  )
  @ApiJsonApiError(400, 'Malformed body or invalid attributes')
  @ApiJsonApiError(409, 'Wrong resource type or duplicate email')
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiIfNoneMatchHeader()
  @ApiJsonApiResponse(
    200,
    jsonApiResourceSchema('users', UserResourceAttributes),
    'The requested user',
    ETAG_RESPONSE_HEADERS,
  )
  @ApiNotModifiedResponse()
  @ApiJsonApiError(400, 'Malformed id')
  @ApiJsonApiError(404, 'User not found')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.usersService.findById(user, id);
  }

  @Patch(':id')
  @UseInterceptors(new JsonApiRequestInterceptor('users'))
  @ApiOperation({ summary: 'Update a user' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiIfMatchHeader()
  @ApiJsonApiBody('users', UpdateUserDto)
  @ApiJsonApiResponse(
    200,
    jsonApiResourceSchema('users', UserResourceAttributes),
    'The updated user',
    ETAG_RESPONSE_HEADERS,
  )
  @ApiJsonApiError(400, 'Malformed id, body, or invalid attributes')
  @ApiJsonApiError(404, 'User not found')
  @ApiJsonApiError(409, 'Wrong resource type or duplicate email')
  @ApiJsonApiError(412, 'The If-Match ETag is stale; re-read and retry')
  @ApiJsonApiError(428, 'An If-Match header is required')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: User,
    @IfMatch() ifMatch: string | undefined,
  ) {
    return this.usersService.update(user, id, dto, ifMatch);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a user (ADMIN only)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiIfMatchHeader()
  @ApiNoContentResponse({ description: 'The user was deleted' })
  @ApiJsonApiError(404, 'User not found')
  @ApiJsonApiError(412, 'The If-Match ETag is stale; re-read and retry')
  @ApiJsonApiError(428, 'An If-Match header is required')
  delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @IfMatch() ifMatch: string | undefined,
  ) {
    return this.usersService.delete(user, id, ifMatch);
  }
}
