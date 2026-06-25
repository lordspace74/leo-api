import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { IUserRepository } from './interfaces/user-repository.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersRepository implements IUserRepository {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
  ) {}

  findAll(): Promise<User[]> {
    return this.repo.find();
  }

  findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email } });
  }

  async create(dto: CreateUserDto): Promise<User> {
    const hashed = await bcrypt.hash(dto.password, 10);
    const user = this.repo.create({ ...dto, password: hashed });
    return this.repo.save(user);
  }

  async update(id: string, dto: UpdateUserDto): Promise<User | null> {
    const user = await this.findById(id);
    if (!user) return null;

    const changes: Partial<User> = { ...dto };
    if (changes.password) {
      changes.password = await bcrypt.hash(changes.password, 10);
    }

    Object.assign(user, changes);
    return this.repo.save(user);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
