import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../../app.module';
import type { IUserRepository } from '../../users/interfaces/user-repository.interface';
import { USER_REPOSITORY } from '../../users/interfaces/user-repository.interface';
import { UserRole } from '../../users/enums/user-role.enum';

/**
 * Seeds an initial ADMIN account so the API can be administered from a clean
 * database. Registration only ever creates USER accounts by design, so the
 * first admin has to be bootstrapped out-of-band.
 *
 * Credentials are read from the environment with sensible local defaults:
 *   ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD
 *
 * The script is idempotent: running it again with an existing email is a no-op.
 */
async function seedAdmin(): Promise<void> {
  const logger = new Logger('AdminSeed');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const users = app.get<IUserRepository>(USER_REPOSITORY, { strict: false });

    const name = process.env.ADMIN_NAME ?? 'Admin';
    const email = process.env.ADMIN_EMAIL ?? 'admin@example.com';
    const password = process.env.ADMIN_PASSWORD ?? 'password';

    const existing = await users.findByEmail(email);
    if (existing) {
      logger.log(
        `Admin already exists: ${email} (id=${existing.id}) — nothing to do.`,
      );
      return;
    }

    const admin = await users.create({
      name,
      email,
      password,
      role: UserRole.ADMIN,
    });

    logger.log(`Created admin: ${email} (id=${admin.id})`);
    logger.log(`Log in with email="${email}" password="${password}"`);
  } finally {
    await app.close();
  }
}

seedAdmin().catch((err) => {
  console.error('Admin seed failed:', err);
  process.exit(1);
});
