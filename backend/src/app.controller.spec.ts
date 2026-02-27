import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { PrismaService } from './prisma/prisma.service';

describe('AppController', () => {
  let controller: AppController;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: PrismaService,
          useValue: { $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]) },
        },
      ],
    }).compile();

    controller = module.get<AppController>(AppController);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('health', () => {
    it('returns ok', () => {
      expect(controller.health()).toEqual({ status: 'ok' });
    });
  });

  describe('ready', () => {
    it('returns ok when DB is up', async () => {
      await expect(controller.ready()).resolves.toEqual({ status: 'ok' });
      expect(prisma.$queryRaw).toHaveBeenCalled();
    });
  });
});
