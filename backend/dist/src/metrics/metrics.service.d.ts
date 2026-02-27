import { PrismaService } from '../prisma/prisma.service';
export declare class MetricsService {
    private prisma;
    constructor(prisma: PrismaService);
    findRange(hostId: string, from: Date, to: Date, resolution: 'raw' | '1m' | '5m'): Promise<{
        ts: string;
        cpu_total_pct: number;
        load1: number;
        load5: number;
        load15: number;
        mem_used_mb: number;
        mem_total_mb: number;
        disk_used_pct: number;
        net_rx_bps: number;
        net_tx_bps: number;
    }[]>;
}
