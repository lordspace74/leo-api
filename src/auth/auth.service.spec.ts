import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';

jest.mock('bcrypt');

const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

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

describe('AuthService', () => {
  let service: AuthService;
  let repo: jest.Mocked<Pick<Repository<User>, 'findOne' | 'create' | 'save'>>;
  let jwt: jest.Mocked<Pick<JwtService, 'sign'>>;

  beforeEach(async () => {
    const repoMock = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    const jwtMock = { sign: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: repoMock },
        { provide: JwtService, useValue: jwtMock },
      ],
    }).compile();

    service = module.get(AuthService);
    repo = module.get(getRepositoryToken(User));
    jwt = module.get(JwtService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('register', () => {
    it('hashes the password and persists a new user', async () => {
      repo.findOne.mockResolvedValue(null);
      mockedBcrypt.hash.mockResolvedValue('hashed-pw' as never);
      const created = buildUser({ password: 'hashed-pw' });
      repo.create.mockReturnValue(created);
      repo.save.mockResolvedValue(created);

      const result = await service.register({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password',
      });

      expect(mockedBcrypt.hash).toHaveBeenCalledWith('password', 10);
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ password: 'hashed-pw' }),
      );
      expect(result).toBe(created);
    });

    it('throws ConflictException when the email is already taken', async () => {
      repo.findOne.mockResolvedValue(buildUser());

      await expect(
        service.register({
          name: 'John Doe',
          email: 'john@example.com',
          password: 'password',
        }),
      ).rejects.toThrow(ConflictException);
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('issues a token without persisting it', async () => {
      const user = buildUser();
      repo.findOne.mockResolvedValue(user);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      jwt.sign.mockReturnValue('signed-token');

      const result = await service.login({
        email: 'john@example.com',
        password: 'password',
      });

      expect(jwt.sign).toHaveBeenCalledWith({ sub: user.id, email: user.email });
      expect(result.accessToken).toBe('signed-token');
      expect(result.user).toBe(user);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when the user is not found', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@example.com', password: 'password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when the password is wrong', async () => {
      repo.findOne.mockResolvedValue(buildUser());
      mockedBcrypt.compare.mockResolvedValue(false as never);

      await expect(
        service.login({ email: 'john@example.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(jwt.sign).not.toHaveBeenCalled();
    });
  });
});
