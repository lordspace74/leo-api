import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import type { IUserRepository } from './interfaces/user-repository.interface';
import { USER_REPOSITORY } from './interfaces/user-repository.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { UserRole } from './enums/user-role.enum';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
  ) {}

  findAll(): Promise<User[]> {
    return this.userRepo.findAll();
  }

  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.userRepo.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already in use');

    return this.userRepo.create(dto);
  }

  async findById(requestingUser: User, targetId: string): Promise<User> {
    const isAdmin = requestingUser.role === UserRole.ADMIN;
    const isSelf = requestingUser.id === targetId;

    if (!isAdmin && !isSelf) {
      throw new ForbiddenException('You can only view your own account');
    }

    const user = await this.userRepo.findById(targetId);
    if (!user) throw new NotFoundException(`User ${targetId} not found`);
    return user;
  }

  async update(requestingUser: User, targetId: string, dto: UpdateUserDto): Promise<User> {
    const isAdmin = requestingUser.role === UserRole.ADMIN;
    const isSelf = requestingUser.id === targetId;

    if (!isAdmin && !isSelf) {
      throw new ForbiddenException('You can only update your own account');
    }

    if (!isAdmin && dto.role) {
      throw new ForbiddenException('Only admins can change roles');
    }

    if (dto.email) {
      const owner = await this.userRepo.findByEmail(dto.email);
      if (owner && owner.id !== targetId) {
        throw new ConflictException('Email already in use');
      }
    }

    const updated = await this.userRepo.update(targetId, dto);
    if (!updated) throw new NotFoundException(`User ${targetId} not found`);
    return updated;
  }

  async delete(requestingUser: User, targetId: string): Promise<void> {
    if (requestingUser.id === targetId) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    const target = await this.userRepo.findById(targetId);
    if (!target) throw new NotFoundException(`User ${targetId} not found`);

    await this.userRepo.delete(targetId);
  }
}
