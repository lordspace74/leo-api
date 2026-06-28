// Use an isolated database for e2e so dev data is never touched.
process.env.DB_DATABASE = process.env.DB_DATABASE_TEST ?? 'leo_api_test';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'e2e_secret';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

describe('Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('reports healthy with a database ping (200)', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);

    expect(res.body.status).toBe('ok');
    expect(res.body.details.database.status).toBe('up');
  });

  it('is a plain ops endpoint, not stamped with the JSON:API media type', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);

    expect(res.headers['content-type']).not.toContain(
      'application/vnd.api+json',
    );
  });
});
