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
exports.AlertsCronService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../prisma/prisma.service");
const hosts_service_1 = require("../hosts/hosts.service");
const ONLINE_THRESHOLD_MS = 60_000;
let AlertsCronService = class AlertsCronService {
    prisma;
    hosts;
    constructor(prisma, hosts) {
        this.prisma = prisma;
        this.hosts = hosts;
    }
    async checkAlerts() {
        const rules = await this.prisma.alertRule.findMany({
            where: { enabled: true },
            include: { host: true },
        });
        for (const rule of rules) {
            if (rule.metric === 'host_down') {
                await this.checkHostDown(rule);
            }
            else {
                await this.checkThreshold(rule);
            }
        }
    }
    async checkHostDown(rule) {
        if (!rule.hostId)
            return;
        const host = await this.hosts.findOne(rule.hostId);
        if (!host)
            return;
        const lastSeen = host.lastSeenAt ? new Date(host.lastSeenAt).getTime() : 0;
        const isDown = Date.now() - lastSeen > ONLINE_THRESHOLD_MS;
        const existing = await this.prisma.alertEvent.findFirst({
            where: { ruleId: rule.id, hostId: rule.hostId },
            orderBy: { ts: 'desc' },
        });
        const currentFiring = existing?.status === 'firing';
        if (isDown && !currentFiring) {
            await this.prisma.alertEvent.create({
                data: {
                    hostId: rule.hostId,
                    ruleId: rule.id,
                    ts: new Date(),
                    status: 'firing',
                    message: 'Host has not sent metrics within threshold',
                },
            });
        }
        else if (!isDown && currentFiring) {
            await this.prisma.alertEvent.create({
                data: {
                    hostId: rule.hostId,
                    ruleId: rule.id,
                    ts: new Date(),
                    status: 'resolved',
                    message: 'Host is back online',
                },
            });
        }
    }
    async checkThreshold(rule) {
        if (rule.threshold == null)
            return;
        const hostIds = rule.hostId
            ? [rule.hostId]
            : (await this.prisma.host.findMany({ select: { id: true } })).map((h) => h.id);
        for (const hostId of hostIds) {
            const latest = await this.prisma.metricsRaw.findFirst({
                where: { hostId },
                orderBy: { ts: 'desc' },
            });
            if (!latest)
                continue;
            let value;
            switch (rule.metric) {
                case 'cpu_total_pct':
                    value = latest.cpuTotalPct;
                    break;
                case 'mem_used_pct':
                    value = latest.memTotalMb > 0 ? (latest.memUsedMb / latest.memTotalMb) * 100 : 0;
                    break;
                case 'disk_used_pct':
                    value = latest.diskUsedPct;
                    break;
                default:
                    continue;
            }
            const firing = rule.op === '>' ? value > rule.threshold
                : rule.op === '<' ? value < rule.threshold
                    : rule.op === '==' ? value === rule.threshold
                        : false;
            const existing = await this.prisma.alertEvent.findFirst({
                where: { ruleId: rule.id, hostId },
                orderBy: { ts: 'desc' },
            });
            const currentFiring = existing?.status === 'firing';
            if (firing && !currentFiring) {
                await this.prisma.alertEvent.create({
                    data: {
                        hostId,
                        ruleId: rule.id,
                        ts: new Date(),
                        status: 'firing',
                        message: `${rule.metric} ${rule.op} ${rule.threshold} (current: ${value})`,
                    },
                });
            }
            else if (!firing && currentFiring) {
                await this.prisma.alertEvent.create({
                    data: {
                        hostId,
                        ruleId: rule.id,
                        ts: new Date(),
                        status: 'resolved',
                        message: `${rule.metric} back to normal`,
                    },
                });
            }
        }
    }
};
exports.AlertsCronService = AlertsCronService;
__decorate([
    (0, schedule_1.Cron)('*/2 * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AlertsCronService.prototype, "checkAlerts", null);
exports.AlertsCronService = AlertsCronService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        hosts_service_1.HostsService])
], AlertsCronService);
//# sourceMappingURL=alerts-cron.service.js.map