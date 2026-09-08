import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse();
    const request = context.switchToHttp().getRequest();
    const url = request?.url || '';

    // Bypass wrapper for webhooks (Shiprocket, etc.) so external services get raw 200 responses
    if (url.includes('webhook') || url.includes('tracking-update')) {
      return next.handle();
    }
    
    return next.handle().pipe(
      map((data) => {
        // Handle case where service already returns the wrapped format
        if (data && typeof data === 'object' && 'success' in data && ('data' in data || 'error' in data)) {
          return data;
        }

        return {
          success: true,
          data: data,
          error: null,
        };
      }),
    );
  }
}


