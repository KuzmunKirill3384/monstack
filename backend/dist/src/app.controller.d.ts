import { PrismaService } from './prisma/prisma.service';
export declare class AppController {
    private prisma;
    constructor(prisma: PrismaService);
    health(): {
        status: string;
    };
    ready(): Promise<{
        status: string;
    }>;
}
