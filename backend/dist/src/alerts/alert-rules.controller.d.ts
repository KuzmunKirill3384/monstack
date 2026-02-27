import { PrismaService } from '../prisma/prisma.service';
declare class CreateAlertRuleDto {
    hostId: string | null;
    metric: string;
    op: string;
    threshold?: number | null;
    window?: string;
    severity?: string;
}
declare class UpdateAlertRuleDto {
    enabled?: boolean;
    threshold?: number;
}
export declare class AlertRulesController {
    private prisma;
    constructor(prisma: PrismaService);
    list(hostId?: string): import("@prisma/client").Prisma.PrismaPromise<{
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
    create(dto: CreateAlertRuleDto): import("@prisma/client").Prisma.Prisma__AlertRuleClient<{
        id: string;
        createdAt: Date;
        hostId: string | null;
        metric: string;
        op: string;
        threshold: number | null;
        window: string;
        severity: string;
        enabled: boolean;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
    update(id: string, dto: UpdateAlertRuleDto): import("@prisma/client").Prisma.Prisma__AlertRuleClient<{
        id: string;
        createdAt: Date;
        hostId: string | null;
        metric: string;
        op: string;
        threshold: number | null;
        window: string;
        severity: string;
        enabled: boolean;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
    remove(id: string): import("@prisma/client").Prisma.Prisma__AlertRuleClient<{
        id: string;
        createdAt: Date;
        hostId: string | null;
        metric: string;
        op: string;
        threshold: number | null;
        window: string;
        severity: string;
        enabled: boolean;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
}
export {};
