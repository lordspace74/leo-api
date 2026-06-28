import { Test, TestingModule } from '@nestjs/testing';
import {
  HealthCheckResult,
  HealthCheckService,
  HealthIndicatorFunction,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;
  let health: { check: jest.Mock };
  let db: { pingCheck: jest.Mock };

  beforeEach(async () => {
    health = { check: jest.fn() };
    db = { pingCheck: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: health },
        { provide: TypeOrmHealthIndicator, useValue: db },
      ],
    }).compile();

    controller = module.get(HealthController);
  });

  it('runs a database ping check and returns the result', async () => {
    const result = {
      status: 'ok',
      info: { database: { status: 'up' } },
      error: {},
      details: { database: { status: 'up' } },
    } as unknown as HealthCheckResult;

    // Execute the indicators passed to check() so we can assert the DB is pinged.
    health.check.mockImplementation((indicators: HealthIndicatorFunction[]) => {
      indicators.forEach((fn) => void fn());
      return Promise.resolve(result);
    });
    db.pingCheck.mockResolvedValue({ database: { status: 'up' } });

    await expect(controller.check()).resolves.toBe(result);
    expect(db.pingCheck).toHaveBeenCalledWith('database');
  });
});
