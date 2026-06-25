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
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JsonApiInterceptor } from '../common/interceptors/json-api.interceptor';
import { JsonApiRequestInterceptor } from '../common/interceptors/json-api-request.interceptor';
import {
  JsonApiDocument,
  toCollection,
} from '../common/serializers/json-api.serializer';
import { UserRole } from './enums/user-role.enum';
import { User } from './entities/user.entity';

const DEFAULT_PAGE = 1;
const DEFAULT_SIZE = 20;

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(new JsonApiInterceptor('users'))
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN)
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
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.usersService.findById(user, id);
  }

  @Patch(':id')
  @UseInterceptors(new JsonApiRequestInterceptor('users'))
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: User,
  ) {
    return this.usersService.update(user, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.usersService.delete(user, id);
  }
}
