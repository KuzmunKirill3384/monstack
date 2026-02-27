import { AlertsService } from './alerts.service';
export declare class AlertsController {
    private alerts;
    constructor(alerts: AlertsService);
    list(hostId?: string, from?: string, to?: string, status?: string): Promise<({
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
    rules(hostId?: string): Promise<{
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
