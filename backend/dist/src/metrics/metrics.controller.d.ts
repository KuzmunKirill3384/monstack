import { MetricsService } from './metrics.service';
export declare class MetricsController {
    private metrics;
    constructor(metrics: MetricsService);
    list(hostId: string, from: string, to: string, resolution?: string): Promise<{
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
