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
exports.IngestBatchDto = exports.IngestProcessDto = exports.IngestMetricsDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class IngestMetricsDto {
    cpu_total_pct;
    load1;
    load5;
    load15;
    mem_used_mb;
    mem_total_mb;
    disk_used_pct;
    net_rx_bps;
    net_tx_bps;
}
exports.IngestMetricsDto = IngestMetricsDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], IngestMetricsDto.prototype, "cpu_total_pct", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], IngestMetricsDto.prototype, "load1", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], IngestMetricsDto.prototype, "load5", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], IngestMetricsDto.prototype, "load15", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], IngestMetricsDto.prototype, "mem_used_mb", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], IngestMetricsDto.prototype, "mem_total_mb", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], IngestMetricsDto.prototype, "disk_used_pct", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], IngestMetricsDto.prototype, "net_rx_bps", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], IngestMetricsDto.prototype, "net_tx_bps", void 0);
class IngestProcessDto {
    pid;
    name;
    cpu_pct;
    rss_mb;
    io_read_bps;
    io_write_bps;
    state;
}
exports.IngestProcessDto = IngestProcessDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], IngestProcessDto.prototype, "pid", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], IngestProcessDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], IngestProcessDto.prototype, "cpu_pct", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], IngestProcessDto.prototype, "rss_mb", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], IngestProcessDto.prototype, "io_read_bps", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], IngestProcessDto.prototype, "io_write_bps", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], IngestProcessDto.prototype, "state", void 0);
class IngestBatchDto {
    host_id;
    ts;
    metrics;
    processes;
}
exports.IngestBatchDto = IngestBatchDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], IngestBatchDto.prototype, "host_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], IngestBatchDto.prototype, "ts", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: IngestMetricsDto }),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => IngestMetricsDto),
    __metadata("design:type", IngestMetricsDto)
], IngestBatchDto.prototype, "metrics", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [IngestProcessDto], required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => IngestProcessDto),
    __metadata("design:type", Array)
], IngestBatchDto.prototype, "processes", void 0);
//# sourceMappingURL=ingest.dto.js.map