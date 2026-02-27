import { IngestBatchDto } from './ingest.dto';
import { IngestService } from './ingest.service';
import { FastifyRequest } from 'fastify';
export declare class IngestController {
    private ingestService;
    constructor(ingestService: IngestService);
    postIngest(req: FastifyRequest & {
        host: {
            id: string;
        };
    }, dto: IngestBatchDto): Promise<void>;
}
