import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

const AUTH_ENABLED = process.env.AUTH_ENABLED === 'true';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    if (!AUTH_ENABLED) return true;
    return super.canActivate(context);
  }
}
