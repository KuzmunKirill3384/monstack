import { ProcessesService } from './processes.service';
export declare class ProcessesController {
    private processes;
    constructor(processes: ProcessesService);
    list(hostId: string, from?: string, to?: string, limit?: string): Promise<{
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
