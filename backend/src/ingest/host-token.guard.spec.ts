import {
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { HostTokenGuard } from './host-token.guard';
import { HostsService } from '../hosts/hosts.service';

function createMockRequest(overrides: Partial<{ authorization: string }> = {}) {
  return {
    headers: { authorization: 'Bearer test-token', ...overrides },
  };
}

function createMockContext(request: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe('HostTokenGuard', () => {
  let guard: HostTokenGuard;
  let hosts: jest.Mocked<Pick<HostsService, 'hashToken' | 'findByTokenHash'>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HostTokenGuard,
        {
          provide: HostsService,
          useValue: {
            hashToken: jest.fn().mockReturnValue('hashed-token'),
            findByTokenHash: jest.fn().mockResolvedValue({ id: 'host-1' }),
          },
        },
      ],
    }).compile();

    guard = module.get(HostTokenGuard);
    hosts = module.get(HostsService) as jest.Mocked<HostsService>;
  });

  it('returns true and sets request.host when token is valid', async () => {
    const request = createMockRequest();
    const context = createMockContext(request);

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect((request as { host?: { id: string } }).host).toEqual({ id: 'host-1' });
    expect(hosts.hashToken).toHaveBeenCalledWith('test-token');
    expect(hosts.findByTokenHash).toHaveBeenCalledWith('hashed-token');
  });

  it('Object.defineProperty does not break on repeated calls', async () => {
    const request = createMockRequest();
    const context = createMockContext(request);

    const first = await guard.canActivate(context);
    const second = await guard.canActivate(context);

    expect(first).toBe(true);
    expect(second).toBe(true);
    expect((request as { host?: { id: string } }).host).toEqual({ id: 'host-1' });
  });

  it('throws when Authorization header is missing', async () => {
    const request = createMockRequest({ authorization: undefined });
    const context = createMockContext(request);

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(context)).rejects.toThrow(/Missing or invalid/);
  });

  it('throws when Authorization does not start with Bearer', async () => {
    const request = createMockRequest({ authorization: 'Basic xyz' });
    const context = createMockContext(request);

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('throws when token is invalid (host not found)', async () => {
    (hosts.findByTokenHash as jest.Mock).mockResolvedValue(null);

    const request = createMockRequest();
    const context = createMockContext(request);

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(context)).rejects.toThrow(/Invalid host token/);
  });
});
