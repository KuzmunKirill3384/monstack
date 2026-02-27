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
exports.IngestController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const ingest_dto_1 = require("./ingest.dto");
const ingest_service_1 = require("./ingest.service");
const host_token_guard_1 = require("./host-token.guard");
let IngestController = class IngestController {
    ingestService;
    constructor(ingestService) {
        this.ingestService = ingestService;
    }
    async postIngest(req, dto) {
        await this.ingestService.ingest(req.host.id, dto);
    }
};
exports.IngestController = IngestController;
__decorate([
    (0, common_1.Post)('ingest'),
    (0, common_1.UseGuards)(host_token_guard_1.HostTokenGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, ingest_dto_1.IngestBatchDto]),
    __metadata("design:returntype", Promise)
], IngestController.prototype, "postIngest", null);
exports.IngestController = IngestController = __decorate([
    (0, swagger_1.ApiTags)('ingest'),
    (0, common_1.Controller)('v1'),
    __metadata("design:paramtypes", [ingest_service_1.IngestService])
], IngestController);
//# sourceMappingURL=ingest.controller.js.map