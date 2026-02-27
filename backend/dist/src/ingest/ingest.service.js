"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IngestService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const hosts_service_1 = require("../hosts/hosts.service");
let IngestService = class IngestService {
    prisma;
    hosts;
    constructor(prisma, hosts) {
        this.prisma = prisma;
        this.hosts = hosts;
    }
    async ingest(hostId, dto) {
        if (dto.host_id !== hostId) {
            throw new common_1.BadRequestException('host_id does not match token');
        }
        const ts = new Date(dto.ts);
        if (isNaN(ts.getTime())) {
            throw new common_1.BadRequestException('Invalid ts');
        }
        await this.prisma.$transaction([
            this.prisma.metricsRaw.create({
                data: {
                    ts,
                    hostId,
                    cpuTotalPct: dto.metrics.cpu_total_pct,
                    load1: dto.metrics.load1,
                    load5: dto.metrics.load5,
                    load15: dto.metrics.load15,
                    memUsedMb: dto.metrics.mem_used_mb,
                    memTotalMb: dto.metrics.mem_total_mb,
                    diskUsedPct: dto.metrics.disk_used_pct,
                    netRxBps: BigInt(dto.metrics.net_rx_bps),
                    netTxBps: BigInt(dto.metrics.net_tx_bps),
                },
            }),
            ...(dto.processes?.length
                ? dto.processes.map((p) => this.prisma.procSnapshot.create({
                    data: {
                        hostId,
                        ts,
                        pid: p.pid,
                        name: p.name,
                        cpuPct: p.cpu_pct,
                        rssMb: p.rss_mb,
                        ioReadBps: p.io_read_bps != null ? BigInt(p.io_read_bps) : null,
                        ioWriteBps: p.io_write_bps != null ? BigInt(p.io_write_bps) : null,
                        state: p.state ?? null,
                    },
                }))
                : []),
        ]);
        await this.hosts.updateLastSeen(hostId);
    }
};
exports.IngestService = IngestService;
exports.IngestService = IngestService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        hosts_service_1.HostsService])
], IngestService);
//# sourceMappingURL=ingest.service.js.map