import { PrismaService } from '../prisma/prisma.service';
import { HostsService } from '../hosts/hosts.service';
import { IngestBatchDto } from './ingest.dto';
export declare class IngestService {
    private prisma;
    private hosts;
    constructor(prisma: PrismaService, hosts: HostsService);
    ingest(hostId: string, dto: IngestBatchDto): Promise<void>;
}
