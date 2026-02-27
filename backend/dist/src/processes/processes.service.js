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
exports.ProcessesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ProcessesService = class ProcessesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findRange(hostId, from, to, limit = 500) {
        const where = {
            hostId,
        };
        if (from)
            where.ts = { ...where.ts, gte: from };
        if (to)
            where.ts = { ...where.ts, lte: to };
        const rows = await this.prisma.procSnapshot.findMany({
            where,
            orderBy: { ts: 'desc' },
            take: limit,
        });
        return rows.map((r) => ({
            ts: r.ts.toISOString(),
            pid: r.pid,
            name: r.name,
            cpu_pct: r.cpuPct,
            rss_mb: r.rssMb,
            io_read_bps: r.ioReadBps != null ? Number(r.ioReadBps) : null,
            io_write_bps: r.ioWriteBps != null ? Number(r.ioWriteBps) : null,
            state: r.state,
        }));
    }
};
exports.ProcessesService = ProcessesService;
exports.ProcessesService = ProcessesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProcessesService);
//# sourceMappingURL=processes.service.js.map