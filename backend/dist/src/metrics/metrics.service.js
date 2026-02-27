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
exports.MetricsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let MetricsService = class MetricsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findRange(hostId, from, to, resolution) {
        const rows = await this.prisma.metricsRaw.findMany({
            where: {
                hostId,
                ts: { gte: from, lte: to },
            },
            orderBy: { ts: 'asc' },
        });
        return rows.map((r) => ({
            ts: r.ts.toISOString(),
            cpu_total_pct: r.cpuTotalPct,
            load1: r.load1,
            load5: r.load5,
            load15: r.load15,
            mem_used_mb: r.memUsedMb,
            mem_total_mb: r.memTotalMb,
            disk_used_pct: r.diskUsedPct,
            net_rx_bps: Number(r.netRxBps),
            net_tx_bps: Number(r.netTxBps),
        }));
    }
};
exports.MetricsService = MetricsService;
exports.MetricsService = MetricsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MetricsService);
//# sourceMappingURL=metrics.service.js.map