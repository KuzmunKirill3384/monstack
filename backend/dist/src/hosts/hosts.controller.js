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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HostsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const hosts_service_1 = require("./hosts.service");
const process_signal_service_1 = require("./process-signal.service");
const signal_process_dto_1 = require("./signal-process.dto");
let HostsController = class HostsController {
    hosts;
    processSignal;
    constructor(hosts, processSignal) {
        this.hosts = hosts;
        this.processSignal = processSignal;
    }
    list(online) {
        const onlineOnly = online === 'true' ? true : online === 'false' ? false : undefined;
        return this.hosts.findAll(onlineOnly);
    }
    get(id) {
        return this.hosts.findOne(id);
    }
    async signalProcess(id, pid, dto) {
        await this.processSignal.sendSignal(id, pid, dto.signal);
        return { ok: true };
    }
};
exports.HostsController = HostsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiQuery)({ name: 'online', required: false, enum: ['true', 'false'] }),
    __param(0, (0, common_1.Query)('online')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], HostsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], HostsController.prototype, "get", null);
__decorate([
    (0, common_1.Post)(':id/processes/:pid/signal'),
    (0, swagger_1.ApiBody)({ type: signal_process_dto_1.SignalProcessDto }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('pid', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, signal_process_dto_1.SignalProcessDto]),
    __metadata("design:returntype", Promise)
], HostsController.prototype, "signalProcess", null);
exports.HostsController = HostsController = __decorate([
    (0, swagger_1.ApiTags)('hosts'),
    (0, common_1.Controller)('hosts'),
    __metadata("design:paramtypes", [hosts_service_1.HostsService,
        process_signal_service_1.ProcessSignalService])
], HostsController);
//# sourceMappingURL=hosts.controller.js.map