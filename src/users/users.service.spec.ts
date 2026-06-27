import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  NotFoundException,
  ConflictException,
  HttpException,
  HttpStatus,
  PreconditionFailedException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { resourceEtag } from '../common/etag/etag.util';
import {
  IUserRepository,
  USER_REPOSITORY,
} from './interfaces/user-repository.interface';
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

describe('UsersService', () => {
  let service: UsersService;
  let repo: jest.Mocked<IUserRepository>;

  beforeEach(async () => {
    const repoMock: jest.Mocked<IUserRepository> = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: USER_REPOSITORY, useValue: repoMock },
      ],
    }).compile();

    service = module.get(UsersService);
    repo = module.get(USER_REPOSITORY);
  });

  describe('findAll', () => {
    it('returns a page of users with total and computes the offset', async () => {
      const users = [buildUser(), buildUser({ id: 'user-2' })];
      repo.findAll.mockResolvedValue([users, 12]);

      await expect(service.findAll(3, 5)).resolves.toEqual({
        items: users,
        total: 12,
        page: 3,
        size: 5,
      });
      expect(repo.findAll).toHaveBeenCalledWith(10, 5); // (page-1)*size
    });
  });

  describe('create', () => {
    it('creates a user when the email is free', async () => {
      const created = buildUser();
      repo.findByEmail.mockResolvedValue(null);
      repo.create.mockResolvedValue(created);

      const dto = {
        name: 'John',
        email: 'john@example.com',
        password: 'password',
      };
      await expect(service.create(dto)).resolves.toBe(created);
      expect(repo.create).toHaveBeenCalledWith(dto);
    });

    it('throws ConflictException when the email is taken', async () => {
      repo.findByEmail.mockResolvedValue(buildUser());

      await expect(
        service.create({
          name: 'John',
          email: 'john@example.com',
          password: 'password',
        }),
      ).rejects.toThrow(ConflictException);
      expect(repo.create).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('lets a user view their own account', async () => {
      const user = buildUser();
      repo.findById.mockResolvedValue(user);

      await expect(service.findById(user, user.id)).resolves.toBe(user);
    });

    it('lets an admin view any account', async () => {
      const admin = buildUser({ id: 'admin-1', role: UserRole.ADMIN });
      const target = buildUser({ id: 'user-2' });
      repo.findById.mockResolvedValue(target);

      await expect(service.findById(admin, 'user-2')).resolves.toBe(target);
    });

    it('forbids a user from viewing another account', async () => {
      const user = buildUser();

      await expect(service.findById(user, 'user-2')).rejects.toThrow(
        ForbiddenException,
      );
      expect(repo.findById).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the user does not exist', async () => {
      const admin = buildUser({ id: 'admin-1', role: UserRole.ADMIN });
      repo.findById.mockResolvedValue(null);

      await expect(service.findById(admin, 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('lets a user update their own account', async () => {
      const user = buildUser();
      const updated = buildUser({ name: 'Jane' });
      repo.findById.mockResolvedValue(user);
      repo.update.mockResolvedValue(updated);

      await expect(
        service.update(user, user.id, { name: 'Jane' }, resourceEtag(user)),
      ).resolves.toBe(updated);
      expect(repo.update).toHaveBeenCalledWith(user.id, { name: 'Jane' });
    });

    it('lets an admin update another user', async () => {
      const admin = buildUser({ id: 'admin-1', role: UserRole.ADMIN });
      const target = buildUser({ id: 'user-2' });
      const updated = buildUser({ id: 'user-2', name: 'Changed' });
      repo.findById.mockResolvedValue(target);
      repo.update.mockResolvedValue(updated);

      await expect(
        service.update(
          admin,
          'user-2',
          { name: 'Changed' },
          resourceEtag(target),
        ),
      ).resolves.toBe(updated);
    });

    it('lets an admin change another user role', async () => {
      const admin = buildUser({ id: 'admin-1', role: UserRole.ADMIN });
      const target = buildUser({ id: 'user-2' });
      const updated = buildUser({ id: 'user-2', role: UserRole.ADMIN });
      repo.findById.mockResolvedValue(target);
      repo.update.mockResolvedValue(updated);

      await expect(
        service.update(
          admin,
          'user-2',
          { role: UserRole.ADMIN },
          resourceEtag(target),
        ),
      ).resolves.toBe(updated);
    });

    it('forbids a user from updating another user', async () => {
      const user = buildUser();

      await expect(
        service.update(user, 'user-2', { name: 'Nope' }, '*'),
      ).rejects.toThrow(ForbiddenException);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('forbids a non-admin from changing their own role', async () => {
      const user = buildUser();

      await expect(
        service.update(user, user.id, { role: UserRole.ADMIN }, '*'),
      ).rejects.toThrow(ForbiddenException);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when admin updates a non-existent user', async () => {
      const admin = buildUser({ id: 'admin-1', role: UserRole.ADMIN });
      repo.findById.mockResolvedValue(null);

      await expect(
        service.update(admin, 'missing', { name: 'Ghost' }, '*'),
      ).rejects.toThrow(NotFoundException);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('requires an If-Match header (428) and does not write without it', async () => {
      const user = buildUser();
      repo.findById.mockResolvedValue(user);

      await expect(
        service.update(user, user.id, { name: 'Jane' }, undefined),
      ).rejects.toMatchObject({ status: HttpStatus.PRECONDITION_REQUIRED });
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('rejects a stale If-Match (412) and does not write', async () => {
      const user = buildUser();
      repo.findById.mockResolvedValue(user);

      await expect(
        service.update(user, user.id, { name: 'Jane' }, '"stale"'),
      ).rejects.toThrow(PreconditionFailedException);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the new email belongs to another user', async () => {
      const user = buildUser();
      repo.findById.mockResolvedValue(user);
      repo.findByEmail.mockResolvedValue(buildUser({ id: 'user-2' }));

      await expect(
        service.update(
          user,
          user.id,
          { email: 'taken@example.com' },
          resourceEtag(user),
        ),
      ).rejects.toThrow(ConflictException);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('allows keeping the same email (owner is the target user)', async () => {
      const user = buildUser();
      repo.findById.mockResolvedValue(user);
      repo.findByEmail.mockResolvedValue(user);
      const updated = buildUser({ name: 'Renamed' });
      repo.update.mockResolvedValue(updated);

      await expect(
        service.update(
          user,
          user.id,
          { email: user.email, name: 'Renamed' },
          resourceEtag(user),
        ),
      ).resolves.toBe(updated);
    });
  });

  describe('delete', () => {
    it('lets an admin delete another user', async () => {
      const admin = buildUser({ id: 'admin-1', role: UserRole.ADMIN });
      const target = buildUser({ id: 'user-2' });
      repo.findById.mockResolvedValue(target);

      await service.delete(admin, 'user-2', resourceEtag(target));
      expect(repo.delete).toHaveBeenCalledWith('user-2');
    });

    it('forbids any user from deleting themselves', async () => {
      const admin = buildUser({ id: 'admin-1', role: UserRole.ADMIN });

      await expect(service.delete(admin, admin.id, '*')).rejects.toThrow(
        ForbiddenException,
      );
      expect(repo.delete).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when deleting a non-existent user', async () => {
      const admin = buildUser({ id: 'admin-1', role: UserRole.ADMIN });
      repo.findById.mockResolvedValue(null);

      await expect(service.delete(admin, 'missing', '*')).rejects.toThrow(
        NotFoundException,
      );
      expect(repo.delete).not.toHaveBeenCalled();
    });

    it('requires an If-Match header (428) and does not delete without it', async () => {
      const admin = buildUser({ id: 'admin-1', role: UserRole.ADMIN });
      repo.findById.mockResolvedValue(buildUser({ id: 'user-2' }));

      await expect(
        service.delete(admin, 'user-2', undefined),
      ).rejects.toBeInstanceOf(HttpException);
      await expect(
        service.delete(admin, 'user-2', undefined),
      ).rejects.toMatchObject({ status: HttpStatus.PRECONDITION_REQUIRED });
      expect(repo.delete).not.toHaveBeenCalled();
    });

    it('rejects a stale If-Match (412) and does not delete', async () => {
      const admin = buildUser({ id: 'admin-1', role: UserRole.ADMIN });
      repo.findById.mockResolvedValue(buildUser({ id: 'user-2' }));

      await expect(service.delete(admin, 'user-2', '"stale"')).rejects.toThrow(
        PreconditionFailedException,
      );
      expect(repo.delete).not.toHaveBeenCalled();
    });
  });
});
