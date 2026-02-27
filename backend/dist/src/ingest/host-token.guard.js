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
exports.HostTokenGuard = void 0;
const common_1 = require("@nestjs/common");
const hosts_service_1 = require("../hosts/hosts.service");
let HostTokenGuard = class HostTokenGuard {
    hosts;
    constructor(hosts) {
        this.hosts = hosts;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const auth = request.headers.authorization;
        if (!auth?.startsWith('Bearer ')) {
            throw new common_1.UnauthorizedException('Missing or invalid Authorization');
        }
        const token = auth.slice(7);
        const tokenHash = this.hosts.hashToken(token);
        const host = await this.hosts.findByTokenHash(tokenHash);
        if (!host) {
            throw new common_1.UnauthorizedException('Invalid host token');
        }
        request.host = { id: host.id };
        return true;
    }
};
exports.HostTokenGuard = HostTokenGuard;
exports.HostTokenGuard = HostTokenGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [hosts_service_1.HostsService])
], HostTokenGuard);
//# sourceMappingURL=host-token.guard.js.map