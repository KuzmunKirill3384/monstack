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
exports.AlertRulesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const prisma_service_1 = require("../prisma/prisma.service");
const class_validator_1 = require("class-validator");
class CreateAlertRuleDto {
    hostId;
    metric;
    op;
    threshold;
    window;
    severity;
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], CreateAlertRuleDto.prototype, "hostId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateAlertRuleDto.prototype, "metric", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateAlertRuleDto.prototype, "op", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateAlertRuleDto.prototype, "threshold", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateAlertRuleDto.prototype, "window", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateAlertRuleDto.prototype, "severity", void 0);
class UpdateAlertRuleDto {
    enabled;
    threshold;
}
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], UpdateAlertRuleDto.prototype, "enabled", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateAlertRuleDto.prototype, "threshold", void 0);
let AlertRulesController = class AlertRulesController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    list(hostId) {
        return this.prisma.alertRule.findMany({
            where: hostId ? { OR: [{ hostId }, { hostId: null }] } : undefined,
        });
    }
    create(dto) {
        return this.prisma.alertRule.create({
            data: {
                hostId: dto.hostId ?? undefined,
                metric: dto.metric,
                op: dto.op,
                threshold: dto.threshold ?? undefined,
                window: dto.window ?? '5m',
                severity: dto.severity ?? 'warning',
            },
        });
    }
    update(id, dto) {
        return this.prisma.alertRule.update({
            where: { id },
            data: {
                ...(dto.enabled !== undefined && { enabled: dto.enabled }),
                ...(dto.threshold !== undefined && { threshold: dto.threshold }),
            },
        });
    }
    remove(id) {
        return this.prisma.alertRule.delete({ where: { id } });
    }
};
exports.AlertRulesController = AlertRulesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('host')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AlertRulesController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateAlertRuleDto]),
    __metadata("design:returntype", void 0)
], AlertRulesController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, UpdateAlertRuleDto]),
    __metadata("design:returntype", void 0)
], AlertRulesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AlertRulesController.prototype, "remove", null);
exports.AlertRulesController = AlertRulesController = __decorate([
    (0, swagger_1.ApiTags)('alert-rules'),
    (0, common_1.Controller)('alert-rules'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AlertRulesController);
//# sourceMappingURL=alert-rules.controller.js.map