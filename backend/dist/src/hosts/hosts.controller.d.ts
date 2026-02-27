import { HostsService } from './hosts.service';
import { ProcessSignalService } from './process-signal.service';
import { SignalProcessDto } from './signal-process.dto';
export declare class HostsController {
    private hosts;
    private processSignal;
    constructor(hosts: HostsService, processSignal: ProcessSignalService);
    list(online?: string): Promise<{
        online: boolean;
        lastMetric: {
            cpu_total_pct: number;
            mem_used_mb: number;
            mem_total_mb: number;
            load1: number;
            load5: number;
            load15: number;
        } | null;
        id: string;
        createdAt: Date;
        name: string;
        tokenHash: string;
        agentUrl: string | null;
        os: string | null;
        arch: string | null;
        tags: import("@prisma/client/runtime/library").JsonValue | null;
        lastSeenAt: Date | null;
    }[]>;
    get(id: string): Promise<{
        online: boolean;
        id: string;
        createdAt: Date;
        name: string;
        tokenHash: string;
        agentUrl: string | null;
        os: string | null;
        arch: string | null;
        tags: import("@prisma/client/runtime/library").JsonValue | null;
        lastSeenAt: Date | null;
    } | null>;
    signalProcess(id: string, pid: number, dto: SignalProcessDto): Promise<{
        ok: boolean;
    }>;
}
