import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  // Swagger API docs
  const config = new DocumentBuilder()
    .setTitle('NinjaBackup API')
    .setDescription('Multi-tenant backup platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication & authorization')
    .addTag('tenants', 'Tenant management')
    .addTag('users', 'User management')
    .addTag('agents', 'Backup agent management')
    .addTag('policies', 'Backup policy management')
    .addTag('jobs', 'Backup job management')
    .addTag('snapshots', 'Snapshot & versioning')
    .addTag('restore', 'Restore operations')
    .addTag('storage', 'Storage vault management')
    .addTag('alerts', 'Alerts & notifications')
    .addTag('audit', 'Audit logs')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 3038;
  await app.listen(port);
  console.log(`🚀 NinjaBackup API running on port ${port}`);
  console.log(`📚 Swagger UI: http://localhost:${port}/docs`);
}

bootstrap();
