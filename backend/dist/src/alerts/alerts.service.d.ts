import { PrismaService } from '../prisma/prisma.service';
export declare class AlertsService {
    private prisma;
    constructor(prisma: PrismaService);
    findEvents(hostId?: string, from?: Date, to?: Date, status?: string): Promise<({
        rule: {
            id: string;
            createdAt: Date;
            hostId: string | null;
            metric: string;
            op: string;
            threshold: number | null;
            window: string;
            severity: string;
            enabled: boolean;
        };
    } & {
        id: string;
        ts: Date;
        hostId: string;
        ruleId: string;
        status: string;
        message: string | null;
    })[]>;
    findRules(hostId?: string): Promise<{
        id: string;
        createdAt: Date;
        hostId: string | null;
        metric: string;
        op: string;
        threshold: number | null;
        window: string;
        severity: string;
        enabled: boolean;
    }[]>;
}
