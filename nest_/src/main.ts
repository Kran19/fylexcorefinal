import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

import * as fs from 'fs';
import { PrismaService } from './prisma/prisma.service';

// Fix BigInt JSON serialization globally across NestJS
(BigInt.prototype as any).toJSON = function () {
  const intVal = Number(this);
  return Number.isSafeInteger(intVal) ? intVal : this.toString();
};

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api');

  // Automatic Production Media Optimization Interceptor Middleware
  app.use(['/uploads', '/api/uploads'], async (req: any, res: any, next: any) => {
    const reqPath = req.path;
    if (reqPath && typeof reqPath === 'string' && !reqPath.includes('/optimized/') && !reqPath.includes('/archive/')) {
      const fileName = reqPath.replace(/^\/+/, '').split('/').pop();
      if (fileName) {
        try {
          const prismaService = app.get(PrismaService);
          const media = await prismaService.media.findFirst({
            where: {
              OR: [
                { fileName: fileName },
                { originalFilename: fileName },
                { filePath: { endsWith: fileName } }
              ]
            },
            include: { variants: true }
          });

          if (media && media.serveMode !== 'original') {
            const bestVariant = (media.variants && media.variants.length > 0)
              ? media.variants.reduce((prev, curr) => (Number(curr.fileSize) < Number(prev.fileSize) ? curr : prev), media.variants[0])
              : null;

            if (bestVariant && bestVariant.filePath) {
              let absVariantPath = join(process.cwd(), bestVariant.filePath.replace(/^\//, ''));
              if (!fs.existsSync(absVariantPath)) {
                const webpFolder = join(process.cwd(), 'uploads/optimized/webp');
                if (fs.existsSync(webpFolder)) {
                  const diskFiles = fs.readdirSync(webpFolder);
                  const match = diskFiles.find(f => f.startsWith(`${media.id}_`) && f.endsWith('.webp'));
                  if (match) {
                    absVariantPath = join(webpFolder, match);
                  }
                }
              }
              if (fs.existsSync(absVariantPath)) {
                return res.sendFile(absVariantPath);
              }
            }
          }
        } catch (e) {
          // Fall through to default static file handler if query fails
        }
      }
    }
    next();
  });
  
  // Serve static uploads under both /uploads/ and /api/uploads/
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/api/uploads/',
  });
  
  // Enable CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // Global interceptors
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('Fylex API Docs')
    .setDescription('Fylex E-Commerce Backend Endpoints')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
