import { Test, TestingModule } from '@nestjs/testing';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import * as crypto from 'crypto';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;

  const salt = 'test-salt';
  const passwordHash = crypto.createHash('sha256').update('pass' + salt).digest('hex');
  const mockUser = {
    id: 'u1',
    email: 'u@test.com',
    passwordHash,
    role: 'user',
    createdAt: new Date(),
  };

  let origSalt: string | undefined;

  beforeEach(async () => {
    origSalt = process.env.PASSWORD_SALT;
    process.env.PASSWORD_SALT = salt;

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'test-secret',
          signOptions: { expiresIn: '1h' },
        }),
      ],
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: { findUnique: jest.fn() },
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    process.env.PASSWORD_SALT = origSalt;
  });

  it('validateUser returns null when user not found', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    const result = await service.validateUser('unknown@test.com', 'pass');
    expect(result).toBeNull();
  });

  it('validateUser returns null when password wrong', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    const result = await service.validateUser('u@test.com', 'wrong');
    expect(result).toBeNull();
  });

  it('validateUser returns user when credentials valid', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    const result = await service.validateUser('u@test.com', 'pass');
    expect(result).toEqual(mockUser);
  });

  it('signToken returns JWT string with sub and email', () => {
    const token = service.signToken(mockUser);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    expect(payload.sub).toBe('u1');
    expect(payload.email).toBe('u@test.com');
    expect(payload.role).toBe('user');
  });

  it('login returns access_token', async () => {
    const result = await service.login(mockUser);
    expect(result).toEqual({ access_token: expect.any(String) });
  });
});
