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
exports.ProcessSignalService = void 0;
const common_1 = require("@nestjs/common");
const hosts_service_1 = require("./hosts.service");
const ALLOWED_SIGNALS = ['SIGTERM', 'SIGKILL', 'SIGINT', 'SIGHUP'];
let ProcessSignalService = class ProcessSignalService {
    hosts;
    constructor(hosts) {
        this.hosts = hosts;
    }
    async sendSignal(hostId, pid, signal) {
        const host = await this.hosts.findOne(hostId);
        if (!host) {
            throw new common_1.NotFoundException('Host not found');
        }
        const agentUrl = host.agentUrl ?? undefined;
        if (!agentUrl) {
            throw new common_1.BadRequestException('Agent URL not configured for this host');
        }
        const normalized = signal.toUpperCase();
        if (!ALLOWED_SIGNALS.includes(normalized)) {
            throw new common_1.BadRequestException(`Invalid signal. Allowed: ${ALLOWED_SIGNALS.join(', ')}`);
        }
        const secret = process.env.AGENT_COMMAND_SECRET;
        if (!secret) {
            throw new common_1.BadRequestException('Agent command secret not configured');
        }
        const base = agentUrl.replace(/\/$/, '');
        const url = `${base}/signal`;
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Agent-Secret': secret,
            },
            body: JSON.stringify({ pid, signal: normalized }),
        });
        if (!res.ok) {
            const text = await res.text();
            throw new common_1.BadRequestException(`Agent returned ${res.status}: ${text || res.statusText}`);
        }
    }
};
exports.ProcessSignalService = ProcessSignalService;
exports.ProcessSignalService = ProcessSignalService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [hosts_service_1.HostsService])
], ProcessSignalService);
//# sourceMappingURL=process-signal.service.js.map