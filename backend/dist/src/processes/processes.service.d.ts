import { PrismaService } from '../prisma/prisma.service';
export declare class ProcessesService {
    private prisma;
    constructor(prisma: PrismaService);
    findRange(hostId: string, from?: Date, to?: Date, limit?: number): Promise<{
        ts: string;
        pid: number;
        name: string;
        cpu_pct: number;
        rss_mb: number;
        io_read_bps: number | null;
        io_write_bps: number | null;
        state: string | null;
    }[]>;
}
