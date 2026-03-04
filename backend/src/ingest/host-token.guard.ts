import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { HostsService } from '../hosts/hosts.service';

@Injectable()
export class HostTokenGuard implements CanActivate {
  constructor(private hosts: HostsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const auth = request.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization');
    }
    const token = auth.slice(7);
    const tokenHash = this.hosts.hashToken(token);
    const host = await this.hosts.findByTokenHash(tokenHash);
    if (!host) {
      throw new UnauthorizedException('Invalid host token');
    }
    Object.defineProperty(request, 'host', {
      value: { id: host.id },
      writable: true,
      configurable: true,
    });
    return true;
  }
}
