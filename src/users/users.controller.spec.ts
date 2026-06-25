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
    it('returns a paginated JSON:API collection document', async () => {
      const users = [buildUser(), buildUser({ id: 'user-2' })];
      service.findAll.mockResolvedValue({ items: users, total: 2, page: 1, size: 20 });

      const result = await controller.findAll({});

      expect(service.findAll).toHaveBeenCalledWith(1, 20); // defaults
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.meta).toMatchObject({ total: 2, page: 1, size: 20, totalPages: 1 });
      expect(result.links).toHaveProperty('self');
    });

    it('honours page[number] and page[size] params', async () => {
      service.findAll.mockResolvedValue({ items: [], total: 0, page: 2, size: 5 });

      await controller.findAll({ page: { number: 2, size: 5 } });

      expect(service.findAll).toHaveBeenCalledWith(2, 5);
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
