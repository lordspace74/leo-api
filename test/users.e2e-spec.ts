// Use an isolated database for e2e so dev data is never touched.
process.env.DB_DATABASE = process.env.DB_DATABASE_TEST ?? 'leo_api_test';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'e2e_secret';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { USER_REPOSITORY } from '../src/users/interfaces/user-repository.interface';
import type { IUserRepository } from '../src/users/interfaces/user-repository.interface';
import { UserRole } from '../src/users/enums/user-role.enum';

const NONEXISTENT_ID = '00000000-0000-0000-0000-000000000000';
const doc = (attributes: Record<string, unknown>) => ({
  data: { type: 'users', attributes },
});

describe('Users API (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<INestApplication['getHttpServer']>;

  let adminId: string;
  let adminToken: string;
  let aliceId: string;
  let aliceToken: string;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    http = app.getHttpServer();

    // Clean slate, then seed an admin directly through the repository.
    await app
      .get(DataSource)
      .query('TRUNCATE TABLE users RESTART IDENTITY CASCADE');
    const users = app.get<IUserRepository>(USER_REPOSITORY, { strict: false });
    const admin = await users.create({
      name: 'Admin',
      email: 'admin@e2e.test',
      password: 'password',
      role: UserRole.ADMIN,
    });
    adminId = admin.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('registration & login', () => {
    it('registers a USER (201) and returns a JSON:API document', async () => {
      const res = await request(http)
        .post('/auth/register')
        .send(
          doc({ name: 'Alice', email: 'alice@e2e.test', password: 'password' }),
        )
        .expect(201);

      expect(res.headers['content-type']).toContain('application/vnd.api+json');
      expect(res.body.data.type).toBe('users');
      expect(res.body.data.attributes.role).toBe('USER');
      expect(res.body.data.attributes).not.toHaveProperty('password');
      aliceId = res.body.data.id;
    });

    it('rejects a non-JSON:API (flat) body (400)', () =>
      request(http)
        .post('/auth/register')
        .send({ name: 'Flat', email: 'flat@e2e.test', password: 'password' })
        .expect(400));

    it('rejects a duplicate email (409)', () =>
      request(http)
        .post('/auth/register')
        .send(
          doc({ name: 'Dup', email: 'alice@e2e.test', password: 'password' }),
        )
        .expect(409));

    it('rejects invalid attributes (400)', () =>
      request(http)
        .post('/auth/register')
        .send(doc({ name: 'X', email: 'not-an-email', password: '123' }))
        .expect(400));

    it('logs in and returns a token in meta (200)', async () => {
      const alice = await request(http)
        .post('/auth/login')
        .send({ email: 'alice@e2e.test', password: 'password' })
        .expect(200);
      expect(alice.body.meta.access_token).toBeDefined();
      aliceToken = alice.body.meta.access_token;

      const admin = await request(http)
        .post('/auth/login')
        .send({ email: 'admin@e2e.test', password: 'password' })
        .expect(200);
      adminToken = admin.body.meta.access_token;
    });

    it('rejects bad credentials (401)', () =>
      request(http)
        .post('/auth/login')
        .send({ email: 'alice@e2e.test', password: 'wrongpassword' })
        .expect(401));
  });

  describe('USER authorization', () => {
    it('requires authentication (401)', () =>
      request(http).get(`/users/${aliceId}`).expect(401));

    it('lets a USER read their own record (200)', () =>
      request(http)
        .get(`/users/${aliceId}`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .expect(200));

    it('forbids a USER reading another user (403)', () =>
      request(http)
        .get(`/users/${adminId}`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .expect(403));

    it('forbids a USER listing all users (403)', () =>
      request(http)
        .get('/users')
        .set('Authorization', `Bearer ${aliceToken}`)
        .expect(403));

    it('forbids a USER changing their own role (403)', () =>
      request(http)
        .patch(`/users/${aliceId}`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .send(doc({ role: 'ADMIN' }))
        .expect(403));

    it('returns 400 for a malformed id', () =>
      request(http)
        .get('/users/not-a-uuid')
        .set('Authorization', `Bearer ${aliceToken}`)
        .expect(400));
  });

  describe('ADMIN operations', () => {
    it('lists all users with pagination meta and links (200)', async () => {
      const res = await request(http)
        .get('/users?page[number]=1&page[size]=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toMatchObject({ page: 1, size: 10 });
      expect(res.body.links).toHaveProperty('self');
    });

    it('rejects an invalid page size (400)', () =>
      request(http)
        .get('/users?page[size]=0')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400));

    it('creates a user (201)', () =>
      request(http)
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(
          doc({
            name: 'Bob',
            email: 'bob@e2e.test',
            password: 'password',
            role: 'USER',
          }),
        )
        .expect(201));

    it('updates another user role (200)', () =>
      request(http)
        .patch(`/users/${aliceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(doc({ role: 'ADMIN' }))
        .expect(200));

    it('returns 404 updating a non-existent user', () =>
      request(http)
        .patch(`/users/${NONEXISTENT_ID}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(doc({ name: 'Ghost' }))
        .expect(404));

    it('forbids deleting yourself (403)', () =>
      request(http)
        .delete(`/users/${adminId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403));

    it('deletes another user (204)', () =>
      request(http)
        .delete(`/users/${aliceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204));

    it('returns 404 deleting an already-deleted user', () =>
      request(http)
        .delete(`/users/${aliceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404));
  });
});
