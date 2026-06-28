import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';

/** Shape of a Terminus health-check result, for the OpenAPI doc. */
const healthResultSchema = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['ok', 'error', 'shutting_down'] },
    info: { type: 'object', additionalProperties: { type: 'object' } },
    error: { type: 'object', additionalProperties: { type: 'object' } },
    details: { type: 'object', additionalProperties: { type: 'object' } },
  },
};

/**
 * Operational health endpoint for load balancers and orchestrators. It is a
 * plain (non-JSON:API) ops route — public, and exempt from the JSON:API media
 * type and error envelope — so probes see Terminus's standard result shape.
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Liveness/readiness check (verifies the database)' })
  @ApiResponse({
    status: 200,
    description: 'All checks passed',
    schema: healthResultSchema,
  })
  @ApiResponse({
    status: 503,
    description: 'A dependency (e.g. the database) is unavailable',
    schema: healthResultSchema,
  })
  check() {
    return this.health.check([() => this.db.pingCheck('database')]);
  }
}
