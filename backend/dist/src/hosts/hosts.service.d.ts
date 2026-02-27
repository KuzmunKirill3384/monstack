import { PrismaService } from '../prisma/prisma.service';
export declare class HostsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(onlineOnly?: boolean): Promise<{
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
    findOne(id: string): Promise<{
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
    updateLastSeen(hostId: string): Promise<void>;
    findByTokenHash(tokenHash: string): Promise<{
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
    hashToken(token: string): string;
    create(data: {
        name: string;
        token: string;
        os?: string;
        arch?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        tokenHash: string;
        agentUrl: string | null;
        os: string | null;
        arch: string | null;
        tags: import("@prisma/client/runtime/library").JsonValue | null;
        lastSeenAt: Date | null;
    }>;
}
