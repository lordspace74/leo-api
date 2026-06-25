import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UserRole } from './enums/user-role.enum';

const buildUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  name: 'John Doe',
  email: 'john@example.com',
  password: 'hashed',
  role: UserRole.USER,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

describe('UsersController', () => {
  let controller: UsersController;
  let service: jest.Mocked<Pick<UsersService, 'findAll' | 'findById' | 'update' | 'delete'>>;

  beforeEach(async () => {
    const serviceMock = {
      findAll: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: serviceMock }],
    }).compile();

    controller = module.get(UsersController);
    service = module.get(UsersService);
  });

  describe('findAll', () => {
    it('delegates to the service', async () => {
      const users = [buildUser()];
      service.findAll.mockResolvedValue(users);

      await expect(controller.findAll()).resolves.toBe(users);
    });
  });

  describe('findOne', () => {
    it('lets a user view their own account', async () => {
      const user = buildUser();
      service.findById.mockResolvedValue(user);

      await expect(controller.findOne(user.id, user)).resolves.toBe(user);
    });

    it('lets an admin view any account', async () => {
      const admin = buildUser({ id: 'admin-1', role: UserRole.ADMIN });
      const target = buildUser({ id: 'user-2' });
      service.findById.mockResolvedValue(target);

      await expect(controller.findOne('user-2', admin)).resolves.toBe(target);
    });

    it('forbids a user from viewing another account', async () => {
      const user = buildUser();

      await expect(controller.findOne('user-2', user)).rejects.toThrow(ForbiddenException);
      expect(service.findById).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('passes the requesting user through to the service', async () => {
      const user = buildUser();
      const updated = buildUser({ name: 'Jane' });
      service.update.mockResolvedValue(updated);

      await expect(controller.update(user.id, { name: 'Jane' }, user)).resolves.toBe(updated);
      expect(service.update).toHaveBeenCalledWith(user, user.id, { name: 'Jane' });
    });
  });

  describe('delete', () => {
    it('passes the requesting user through to the service', async () => {
      const admin = buildUser({ id: 'admin-1', role: UserRole.ADMIN });
      service.delete.mockResolvedValue(undefined);

      await controller.delete('user-2', admin);
      expect(service.delete).toHaveBeenCalledWith(admin, 'user-2');
    });
  });
});
