export declare class IngestMetricsDto {
    cpu_total_pct: number;
    load1: number;
    load5: number;
    load15: number;
    mem_used_mb: number;
    mem_total_mb: number;
    disk_used_pct: number;
    net_rx_bps: number;
    net_tx_bps: number;
}
export declare class IngestProcessDto {
    pid: number;
    name: string;
    cpu_pct: number;
    rss_mb: number;
    io_read_bps?: number;
    io_write_bps?: number;
    state?: string;
}
export declare class IngestBatchDto {
    host_id: string;
    ts: string;
    metrics: IngestMetricsDto;
    processes?: IngestProcessDto[];
}
