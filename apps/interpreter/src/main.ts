import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

const port = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 5000;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();

  // Dynamic import of swagger to avoid static type resolution issues in this workspace
  try {
    const swagger = await import('@nestjs/swagger');
    const { SwaggerModule, DocumentBuilder } = swagger;

    const config = new DocumentBuilder()
      .setTitle('MetaSolverStrategy')
      .setDescription('MetaSolverStrategy Interpreter API')
      .setVersion('1.0')
      .build();

    const documentFactory = () => SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, documentFactory);

    const document = SwaggerModule.createDocument(app, config);

    // Ensure spec directory exists and write swagger.json to maintain compatibility
    const specDir = path.join(process.cwd(), 'spec');
    try {
      fs.mkdirSync(specDir, { recursive: true });
      fs.writeFileSync(path.join(specDir, 'swagger.json'), JSON.stringify(document, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Failed to write spec/swagger.json:', e);
    }

    SwaggerModule.setup('docs', app, document);
  } catch (e) {
    // If swagger isn't available at runtime, continue without it
    console.warn('Swagger setup skipped:', e);
  }

  app.setGlobalPrefix('');
  await app.listen(port);
  console.log(`MetaSolverStrategy server listening at http://localhost:${port}`);
  console.log(`Swagger UI available at http://localhost:${port}/docs`);
}

await bootstrap();
