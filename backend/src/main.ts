import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable global validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: false,
  }));
  
  // Increase JSON body limit to 50MB for base64 image uploads
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.use(express.json({ limit: '50mb' }));
  
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
