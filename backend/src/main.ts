import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const trust =
    process.env.TRUST_PROXY === 'true' || process.env.TRUST_PROXY === '1';
  if (trust) {
    app.getHttpAdapter().getInstance().set('trust proxy', true);
  }
  app.enableCors({
    origin: "*",
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
