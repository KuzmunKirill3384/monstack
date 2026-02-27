import { PrismaService } from '../prisma/prisma.service';
import { HostsService } from '../hosts/hosts.service';
export declare class AlertsCronService {
    private prisma;
    private hosts;
    constructor(prisma: PrismaService, hosts: HostsService);
    checkAlerts(): Promise<void>;
    private checkHostDown;
    private checkThreshold;
}
