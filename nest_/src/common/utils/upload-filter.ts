import { BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import { extname } from 'path';
import { diskStorage } from 'multer';

const ALLOWED_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.avif',
  '.gif',
  '.mp4',
  '.webm',
  '.mov',
  '.m4v',
  '.pdf',
]);

const ALLOWED_MIME_PREFIXES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-m4v',
  'application/pdf',
];

export function safeMediaFileFilter(_req: any, file: Express.Multer.File, cb: any) {
  const ext = extname(file?.originalname || '').toLowerCase();
  const mime = (file?.mimetype || '').toLowerCase();

  // Explicitly block active web content (.svg, .html, .js, .php, .sh, .exe) to prevent Stored XSS & RCE
  if (!ALLOWED_EXTENSIONS.has(ext) || !ALLOWED_MIME_PREFIXES.some((p) => mime.startsWith(p))) {
    return cb(
      new BadRequestException(
        `Unsupported or unsafe file type (${ext || mime}). Allowed formats: JPG, PNG, WebP, AVIF, GIF, MP4, WebM, MOV, PDF.`,
      ),
      false,
    );
  }
  cb(null, true);
}

export function createSafeDiskStorage(destination = './uploads') {
  return diskStorage({
    destination,
    filename: (_req, file, cb) => {
      const ext = extname(file.originalname || '').toLowerCase();
      const safeExt = ALLOWED_EXTENSIONS.has(ext) ? ext : '.bin';
      const randomHex = crypto.randomBytes(16).toString('hex');
      cb(null, `${randomHex}${safeExt}`);
    },
  });
}
