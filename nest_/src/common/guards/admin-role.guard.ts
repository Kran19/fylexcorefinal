import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { jwtConstants } from '../../modules/auth/constants';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const jwt = require('jsonwebtoken');

export function extractVerifiedJwtUser(req: any): { userId: string; email?: string; role: string } | null {
  const authHeader = req?.headers?.authorization || req?.headers?.Authorization;
  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice(7).trim();
  if (!token) return null;

  try {
    const decoded: any = jwt.verify(token, jwtConstants.secret);
    if (!decoded || !decoded.sub) return null;
    return {
      userId: String(decoded.sub),
      email: decoded.email,
      role: String(decoded.role || 'customer').toLowerCase(),
    };
  } catch {
    return null;
  }
}

@Injectable()
export class AdminRoleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = extractVerifiedJwtUser(req);

    if (!user) {
      throw new UnauthorizedException('Authentication required. Please sign in as an administrator.');
    }

    if (user.role !== 'admin') {
      throw new ForbiddenException('Administrator privileges are required for this resource.');
    }

    req.user = user;
    return true;
  }
}
