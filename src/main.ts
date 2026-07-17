import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Default Express body limit (~100kb) is far too small for a video
  // screensaver stored as a base64 data URL - raised here rather than
  // pretending this scales (a real deployment should upload video to
  // real blob storage instead and only ever send a URL over the wire).
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,          // strips properties not declared in the DTO
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors(); // tighten to specific origins (dashboard, app) before production

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Intercom API listening on port ${port}`);
}
bootstrap();
