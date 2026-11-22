import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { rateLimitMiddleware } from './common/middleware/rate-limit.middleware';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join, resolve } from 'path';
import * as fs from 'fs';
import * as zlib from 'zlib';
import { PrismaService } from './prisma/prisma.service';
import { json, urlencoded } from 'express';

// Fix BigInt JSON serialization globally across NestJS
(BigInt.prototype as any).toJSON = function () {
  const intVal = Number(this);
  return Number.isSafeInteger(intVal) ? intVal : this.toString();
};

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Trust Nginx reverse proxy so rate limiter reads real client IP accurately
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // ─── 1. Enterprise HTTP Security Headers ──────────────────────────────────
  app.use((req: any, res: any, next: any) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });

  // ─── 2. Multi-Tier Rate Limiting (Anti-Brute-Force, Anti-OTP-Bomb, Anti-DDoS) ─
  app.use(rateLimitMiddleware);

  // ─── 3. Fast Gzip JSON Response Compression (shrinks 15MB product JSON by ~90%) ─
  app.use((req: any, res: any, next: any) => {
    const reqUrl = req.originalUrl || req.url || '';
    if (reqUrl.startsWith('/uploads') || reqUrl.startsWith('/api/uploads')) {
      return next();
    }
    const acceptEnc = String(req.headers?.['accept-encoding'] || '');
    if (!acceptEnc.includes('gzip')) {
      return next();
    }

    const origJson = res.json.bind(res);
    res.json = (body: any) => {
      try {
        const serialized = JSON.stringify(body);
        if (serialized && serialized.length > 1024 && !res.headersSent) {
          const compressed = zlib.gzipSync(Buffer.from(serialized, 'utf8'), { level: 4 });
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Content-Encoding', 'gzip');
          res.setHeader('Vary', 'Accept-Encoding');
          res.setHeader('Content-Length', String(compressed.length));
          return res.end(compressed);
        }
      } catch {
        // Fallback to standard res.json
      }
      return origJson(body);
    };
    next();
  });

  // ─── 4. Safe Request Body Limits (10MB JSON; Multer handles large video streams) ─
  app.use(
    json({
      limit: '10mb',
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(urlencoded({ limit: '10mb', extended: true }));

  app.setGlobalPrefix('api');

  const uploadsRoot = resolve(process.cwd(), 'uploads');

  // ─── 5. Automatic Production Media Optimization & Security Sandbox Middleware ─
  app.use(['/uploads', '/api/uploads'], async (req: any, res: any, next: any) => {
    res.setHeader('Cache-Control', 'public, max-age=2592000');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'; sandbox");

    const reqPath = req.path;
    if (reqPath && typeof reqPath === 'string') {
      const fileName = reqPath.replace(/^\/+/, '').split('/').pop() || '';

      // If requesting an optimized video path like /uploads/optimized/video/938_..._optimized.mp4,
      // check if a newer/smaller variant exists for media #938
      if (reqPath.includes('/optimized/video/')) {
        const idMatch = fileName.match(/^(\d+)_/);
        if (idMatch) {
          try {
            const mediaId = Number(idMatch[1]);
            const prismaService = app.get(PrismaService);
            const media = await prismaService.media.findUnique({
              where: { id: mediaId },
              include: { variants: true },
            });
            if (media && media.serveMode !== 'original' && media.variants?.length > 0) {
              const smallest = media.variants.reduce(
                (prev, curr) => (Number(curr.fileSize) < Number(prev.fileSize) ? curr : prev),
                media.variants[0],
              );
              if (smallest?.filePath) {
                const candidate = resolve(process.cwd(), smallest.filePath.replace(/^\//, ''));
                if (candidate.startsWith(uploadsRoot) && fs.existsSync(candidate)) {
                  res.type('video/mp4');
                  return res.sendFile(candidate);
                }
              }
            }
          } catch {}
        }
      }

      if (!reqPath.includes('/optimized/') && !reqPath.includes('/archive/') && fileName) {
        // Fast path for raw .MOV videos: serve compressed H.264 .mp4 sibling if available
        if (/\.mov$/i.test(fileName)) {
          const mp4Base = fileName.replace(/\.mov$/i, '.mp4');
          const optVideoCandidate = resolve(uploadsRoot, 'optimized/video', mp4Base);
          if (optVideoCandidate.startsWith(uploadsRoot) && fs.existsSync(optVideoCandidate)) {
            res.type('video/mp4');
            return res.sendFile(optVideoCandidate);
          }
        }

        try {
          const prismaService = app.get(PrismaService);
          const media = await prismaService.media.findFirst({
            where: {
              OR: [
                { fileName: fileName },
                { originalFilename: fileName },
                { filePath: { endsWith: fileName } },
              ],
            },
            include: { variants: true },
          });

          if (media && media.serveMode !== 'original') {
            const bestVariant =
              media.variants && media.variants.length > 0
                ? media.variants.reduce(
                    (prev, curr) => (Number(curr.fileSize) < Number(prev.fileSize) ? curr : prev),
                    media.variants[0],
                  )
                : null;

            if (bestVariant && bestVariant.filePath) {
              let absVariantPath = resolve(process.cwd(), bestVariant.filePath.replace(/^\//, ''));
              if (!fs.existsSync(absVariantPath)) {
                const webpFolder = resolve(uploadsRoot, 'optimized/webp');
                if (fs.existsSync(webpFolder)) {
                  const diskFiles = fs.readdirSync(webpFolder);
                  const match = diskFiles.find((f) => f.startsWith(`${media.id}_`) && f.endsWith('.webp'));
                  if (match) {
                    absVariantPath = resolve(webpFolder, match);
                  }
                }
              }
              if (absVariantPath.startsWith(uploadsRoot) && fs.existsSync(absVariantPath)) {
                return res.sendFile(absVariantPath);
              }
            }
          }
        } catch {
          // Fall through to static file handler
        }
      }
    }
    next();
  });

  app.useStaticAssets(uploadsRoot, {
    prefix: '/uploads/',
    maxAge: '30d',
  });
  app.useStaticAssets(uploadsRoot, {
    prefix: '/api/uploads/',
    maxAge: '30d',
  });

  // Path-traversal-safe fallback for missing local upload files
  app.use(['/uploads', '/api/uploads'], (req: any, res: any, next: any) => {
    const rawPath = req.path.replace(/^\/+/, '');
    const cleanFileName = rawPath.replace(/^(api\/)?uploads\//, '');
    const localFilePath = resolve(uploadsRoot, cleanFileName);

    if (!localFilePath.startsWith(uploadsRoot)) {
      return res.status(403).json({ success: false, message: 'Forbidden path' });
    }

    if (fs.existsSync(localFilePath) && fs.statSync(localFilePath).isFile()) {
      return res.sendFile(localFilePath);
    }

    const fallbackPath = resolve(uploadsRoot, 'premium.png');
    if (fallbackPath.startsWith(uploadsRoot) && fs.existsSync(fallbackPath)) {
      return res.sendFile(fallbackPath);
    }
    next();
  });

  // ─── 6. Hardened CORS Policy ──────────────────────────────────────────────
  const allowedOrigins = new Set([
    'https://fylexwatches.com',
    'https://www.fylexwatches.com',
    'http://localhost:3000',
    'http://localhost:3002',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3002',
    ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim()) : []),
  ]);

  app.enableCors({
    origin: (origin, callback) => {
      // Allow same-origin / server-to-server webhooks (no Origin header) & trusted storefront origins
      if (!origin || allowedOrigins.has(origin) || process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      // Also allow Razorpay Magic Checkout iframe origin if needed for shipping/promotions callbacks
      if (origin.endsWith('.razorpay.com') || origin === 'https://api.razorpay.com') {
        return callback(null, true);
      }
      return callback(new Error('Origin not permitted by CORS policy'), false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalInterceptors(new ResponseInterceptor());

  // Only expose Swagger API docs outside production
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Fylex API Docs')
      .setDescription('Fylex E-Commerce Backend Endpoints')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
