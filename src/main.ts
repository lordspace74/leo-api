import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { JsonApiExceptionFilter } from './common/filters/json-api-exception.filter';
import { JsonApiHeaderInterceptor } from './common/interceptors/json-api-header.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalInterceptors(new JsonApiHeaderInterceptor());
  app.useGlobalFilters(new JsonApiExceptionFilter());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
