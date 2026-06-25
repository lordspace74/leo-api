import { Test, TestingModule } from '@nestjs/testing';
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
  let service: jest.Mocked<
    Pick<UsersService, 'findAll' | 'create' | 'findById' | 'update' | 'delete'>
  >;

  beforeEach(async () => {
    const serviceMock = {
      findAll: jest.fn(),
      create: jest.fn(),
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

  describe('create', () => {
    it('delegates to the service', async () => {
      const created = buildUser();
      service.create.mockResolvedValue(created);
      const dto = { name: 'John', email: 'john@example.com', password: 'password' };

      await expect(controller.create(dto)).resolves.toBe(created);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findOne', () => {
    it('delegates to the service with the requesting user', async () => {
      const user = buildUser();
      service.findById.mockResolvedValue(user);

      await expect(controller.findOne('user-2', user)).resolves.toBe(user);
      expect(service.findById).toHaveBeenCalledWith(user, 'user-2');
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
