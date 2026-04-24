import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend-backend communication
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Enable global validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: false,
  }));
  
  // Increase JSON body limit to 50MB for base64 image uploads
  const expressApp = app.getHttpAdapter().getInstance();

  // Normalize bracket notation: Express parses category[]=x as {"category[]": "x"}
  // This middleware converts it back to {"category": ["x"]} for NestJS ValidationPipe
  expressApp.use((req, res, next) => {
    const bracketKeys = Object.keys(req.query).filter(k => k.endsWith('[]'));
    for (const key of bracketKeys) {
      const normalized = key.slice(0, -2); // remove "[]"
      const val = req.query[key];
      req.query[normalized] = Array.isArray(val) ? val : [val];
      delete req.query[key];
    }
    next();
  });

  expressApp.use(express.json({ limit: '50mb' }));
  
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
