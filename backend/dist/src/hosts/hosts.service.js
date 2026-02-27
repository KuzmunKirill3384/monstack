"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HostsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const crypto = __importStar(require("crypto"));
const ONLINE_SECONDS = 30;
let HostsService = class HostsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(onlineOnly) {
        const hosts = await this.prisma.host.findMany({
            orderBy: { lastSeenAt: 'desc' },
        });
        const now = new Date();
        const cutoff = new Date(now.getTime() - ONLINE_SECONDS * 1000);
        const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
        const recentMetrics = await this.prisma.metricsRaw.findMany({
            where: { ts: { gte: fiveMinAgo } },
            orderBy: { ts: 'desc' },
        });
        const lastMetricByHost = new Map();
        for (const m of recentMetrics) {
            if (!lastMetricByHost.has(m.hostId))
                lastMetricByHost.set(m.hostId, m);
        }
        return hosts
            .map((h) => {
            const last = lastMetricByHost.get(h.id);
            return {
                ...h,
                online: h.lastSeenAt ? h.lastSeenAt >= cutoff : false,
                lastMetric: last
                    ? {
                        cpu_total_pct: last.cpuTotalPct,
                        mem_used_mb: last.memUsedMb,
                        mem_total_mb: last.memTotalMb,
                        load1: last.load1,
                        load5: last.load5,
                        load15: last.load15,
                    }
                    : null,
            };
        })
            .filter((h) => (onlineOnly === undefined ? true : onlineOnly ? h.online : !h.online));
    }
    async findOne(id) {
        const host = await this.prisma.host.findUnique({ where: { id } });
        if (!host)
            return null;
        const cutoff = new Date(Date.now() - ONLINE_SECONDS * 1000);
        return {
            ...host,
            online: host.lastSeenAt ? host.lastSeenAt >= cutoff : false,
        };
    }
    async updateLastSeen(hostId) {
        await this.prisma.host.update({
            where: { id: hostId },
            data: { lastSeenAt: new Date() },
        });
    }
    async findByTokenHash(tokenHash) {
        return this.prisma.host.findUnique({
            where: { tokenHash },
        });
    }
    hashToken(token) {
        return crypto.createHash('sha256').update(token).digest('hex');
    }
    async create(data) {
        const tokenHash = this.hashToken(data.token);
        return this.prisma.host.create({
            data: {
                name: data.name,
                tokenHash,
                os: data.os ?? 'linux',
                arch: data.arch,
            },
        });
    }
};
exports.HostsService = HostsService;
exports.HostsService = HostsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], HostsService);
//# sourceMappingURL=hosts.service.js.map