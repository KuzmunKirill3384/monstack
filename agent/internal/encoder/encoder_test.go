package encoder

import (
	"bytes"
	"compress/gzip"
	"encoding/json"
	"testing"
	"time"

	"monagent/internal/procs"
	"monagent/internal/sampler"
)

func TestEncodeBatch_Structure(t *testing.T) {
	ts := time.Date(2025, 1, 15, 12, 0, 0, 0, time.UTC)
	sample := &sampler.Sample{
		TS: ts,
		Metrics: sampler.MetricsSnapshot{
			CPUTotalPct: 25.5,
			Load1:       1.2,
			Load5:       1.1,
			Load15:      1,
			MemUsedMB:   512,
			MemTotalMB:  1024,
			DiskUsedPct: 60,
			NetRxBps:    1000,
			NetTxBps:    500,
		},
		Processes: []procs.ProcInfo{
			{PID: 1, Name: "init", CPUPercent: 0.1, RSSMB: 10, IOReadBps: 0, IOWriteBps: 0, State: "S"},
		},
	}
	dto, err := EncodeBatch("host-abc", sample)
	if err != nil {
		t.Fatalf("EncodeBatch: %v", err)
	}
	if dto.HostID != "host-abc" {
		t.Errorf("HostID = %q", dto.HostID)
	}
	if dto.TS != "2025-01-15T12:00:00.000Z" {
		t.Errorf("TS = %q", dto.TS)
	}
	if dto.Metrics.CPUTotalPct != 25.5 || dto.Metrics.MemUsedMB != 512 {
		t.Errorf("Metrics = %+v", dto.Metrics)
	}
	if len(dto.Processes) != 1 || dto.Processes[0].Name != "init" || dto.Processes[0].PID != 1 {
		t.Errorf("Processes = %+v", dto.Processes)
	}
}

func TestEncodeBatch_EmptyProcesses(t *testing.T) {
	ts := time.Now().UTC()
	sample := &sampler.Sample{TS: ts, Metrics: sampler.MetricsSnapshot{}, Processes: nil}
	dto, err := EncodeBatch("h1", sample)
	if err != nil {
		t.Fatalf("EncodeBatch: %v", err)
	}
	if len(dto.Processes) != 0 {
		t.Errorf("Processes = %v", dto.Processes)
	}
}

func TestEncodeBatch_EmptyHostID(t *testing.T) {
	sample := &sampler.Sample{TS: time.Now().UTC(), Metrics: sampler.MetricsSnapshot{}}
	dto, err := EncodeBatch("", sample)
	if err != nil {
		t.Fatalf("EncodeBatch: %v", err)
	}
	if dto.HostID != "" {
		t.Errorf("HostID should be empty, got %q", dto.HostID)
	}
}

func TestEncodeBatch_ZeroMetrics(t *testing.T) {
	sample := &sampler.Sample{
		TS:      time.Now().UTC(),
		Metrics: sampler.MetricsSnapshot{},
	}
	dto, err := EncodeBatch("h1", sample)
	if err != nil {
		t.Fatalf("EncodeBatch: %v", err)
	}
	if dto.Metrics.CPUTotalPct != 0 || dto.Metrics.MemUsedMB != 0 {
		t.Errorf("zero metrics: %+v", dto.Metrics)
	}
}

func TestEncodeBatch_ManyProcesses(t *testing.T) {
	var procs_ []procs.ProcInfo
	for i := 0; i < 100; i++ {
		procs_ = append(procs_, procs.ProcInfo{
			PID: i + 1, Name: "p", CPUPercent: float64(i), RSSMB: float64(i), State: "S",
		})
	}
	sample := &sampler.Sample{
		TS:        time.Now().UTC(),
		Metrics:   sampler.MetricsSnapshot{},
		Processes: procs_,
	}
	dto, err := EncodeBatch("h1", sample)
	if err != nil {
		t.Fatalf("EncodeBatch: %v", err)
	}
	if len(dto.Processes) != 100 {
		t.Errorf("expected 100 processes, got %d", len(dto.Processes))
	}
}

func TestMarshalGzip_NonEmpty(t *testing.T) {
	dto := &IngestBatchDTO{HostID: "h1", TS: "2025-01-15T12:00:00.000Z", Metrics: MetricsDTO{}}
	data, err := MarshalGzip(dto)
	if err != nil {
		t.Fatalf("MarshalGzip: %v", err)
	}
	if len(data) == 0 {
		t.Fatal("gzip output is empty")
	}
	r, err := gzip.NewReader(bytes.NewReader(data))
	if err != nil {
		t.Fatalf("gzip.NewReader: %v", err)
	}
	defer r.Close()
	var decoded IngestBatchDTO
	if err := json.NewDecoder(r).Decode(&decoded); err != nil {
		t.Fatalf("Decode: %v", err)
	}
	if decoded.HostID != "h1" {
		t.Errorf("decoded HostID = %q", decoded.HostID)
	}
}

func TestMarshalGzip_Roundtrip(t *testing.T) {
	dto := &IngestBatchDTO{
		HostID: "h-test",
		TS:     "2025-06-01T00:00:00.000Z",
		Metrics: MetricsDTO{
			CPUTotalPct: 42.5,
			Load1:       1.5,
			MemUsedMB:   2048,
			MemTotalMB:  4096,
			DiskUsedPct: 70,
			NetRxBps:    100000,
			NetTxBps:    50000,
		},
		Processes: []ProcessDTO{
			{PID: 1, Name: "init", CPUPercent: 0.5, RSSMB: 10, State: "S"},
			{PID: 100, Name: "nginx", CPUPercent: 5.2, RSSMB: 50, IOReadBps: 1000, IOWriteBps: 500, State: "R"},
		},
	}
	data, err := MarshalGzip(dto)
	if err != nil {
		t.Fatalf("MarshalGzip: %v", err)
	}
	r, err := gzip.NewReader(bytes.NewReader(data))
	if err != nil {
		t.Fatalf("gzip reader: %v", err)
	}
	defer r.Close()
	var decoded IngestBatchDTO
	if err := json.NewDecoder(r).Decode(&decoded); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if decoded.HostID != dto.HostID {
		t.Errorf("HostID mismatch")
	}
	if decoded.Metrics.CPUTotalPct != dto.Metrics.CPUTotalPct {
		t.Errorf("CPU mismatch: %.2f vs %.2f", decoded.Metrics.CPUTotalPct, dto.Metrics.CPUTotalPct)
	}
	if len(decoded.Processes) != 2 {
		t.Errorf("Processes count: %d", len(decoded.Processes))
	}
	if decoded.Processes[1].Name != "nginx" {
		t.Errorf("Process[1].Name = %q", decoded.Processes[1].Name)
	}
}

func TestEncodeBatchGzip_NonEmpty(t *testing.T) {
	sample := &sampler.Sample{
		TS:        time.Now().UTC(),
		Metrics:   sampler.MetricsSnapshot{CPUTotalPct: 10},
		Processes: []procs.ProcInfo{},
	}
	data, err := EncodeBatchGzip("host-1", sample)
	if err != nil {
		t.Fatalf("EncodeBatchGzip: %v", err)
	}
	if len(data) == 0 {
		t.Fatal("output is empty")
	}
}

func TestEncodeBatchMaxProcs_Truncates(t *testing.T) {
	sample := &sampler.Sample{
		TS:      time.Now().UTC(),
		Metrics: sampler.MetricsSnapshot{},
		Processes: []procs.ProcInfo{
			{PID: 1, Name: "a", State: "R"},
			{PID: 2, Name: "b", State: "R"},
			{PID: 3, Name: "c", State: "R"},
		},
	}
	dto, err := EncodeBatchMaxProcs("h1", sample, 2)
	if err != nil {
		t.Fatalf("EncodeBatchMaxProcs: %v", err)
	}
	if len(dto.Processes) != 2 {
		t.Errorf("expected 2 processes, got %d", len(dto.Processes))
	}
	if dto.Processes[0].Name != "a" || dto.Processes[1].Name != "b" {
		t.Errorf("Processes = %+v", dto.Processes)
	}
}

func TestEncodeBatchMaxProcs_ZeroLimit(t *testing.T) {
	sample := &sampler.Sample{
		TS:      time.Now().UTC(),
		Metrics: sampler.MetricsSnapshot{},
		Processes: []procs.ProcInfo{
			{PID: 1, Name: "a", State: "R"},
			{PID: 2, Name: "b", State: "R"},
		},
	}
	dto, err := EncodeBatchMaxProcs("h1", sample, 0)
	if err != nil {
		t.Fatalf("EncodeBatchMaxProcs: %v", err)
	}
	if len(dto.Processes) != 2 {
		t.Errorf("zero limit should keep all: got %d", len(dto.Processes))
	}
}

func TestEncodeBatchMaxProcs_LimitExceedsCount(t *testing.T) {
	sample := &sampler.Sample{
		TS:      time.Now().UTC(),
		Metrics: sampler.MetricsSnapshot{},
		Processes: []procs.ProcInfo{
			{PID: 1, Name: "a", State: "S"},
		},
	}
	dto, err := EncodeBatchMaxProcs("h1", sample, 100)
	if err != nil {
		t.Fatalf("EncodeBatchMaxProcs: %v", err)
	}
	if len(dto.Processes) != 1 {
		t.Errorf("expected 1, got %d", len(dto.Processes))
	}
}

func TestEncodeBatch_TSFormat(t *testing.T) {
	ts := time.Date(2025, 12, 31, 23, 59, 59, 999000000, time.UTC)
	sample := &sampler.Sample{TS: ts, Metrics: sampler.MetricsSnapshot{}}
	dto, err := EncodeBatch("h1", sample)
	if err != nil {
		t.Fatalf("EncodeBatch: %v", err)
	}
	if dto.TS != "2025-12-31T23:59:59.999Z" {
		t.Errorf("TS = %q", dto.TS)
	}
}

func TestEncodeBatch_ProcessFields(t *testing.T) {
	sample := &sampler.Sample{
		TS:      time.Now().UTC(),
		Metrics: sampler.MetricsSnapshot{},
		Processes: []procs.ProcInfo{
			{PID: 42, Name: "nginx", CPUPercent: 12.34, RSSMB: 256.5, IOReadBps: 1000, IOWriteBps: 500, State: "R"},
		},
	}
	dto, err := EncodeBatch("h1", sample)
	if err != nil {
		t.Fatal(err)
	}
	p := dto.Processes[0]
	if p.PID != 42 || p.Name != "nginx" || p.CPUPercent != 12.34 || p.RSSMB != 256.5 {
		t.Errorf("Process = %+v", p)
	}
	if p.IOReadBps != 1000 || p.IOWriteBps != 500 || p.State != "R" {
		t.Errorf("Process IO/State = %+v", p)
	}
}

func BenchmarkMarshalGzip(b *testing.B) {
	var procs_ []ProcessDTO
	for i := 0; i < 50; i++ {
		procs_ = append(procs_, ProcessDTO{PID: i, Name: "proc", CPUPercent: float64(i), RSSMB: float64(i * 10)})
	}
	dto := &IngestBatchDTO{
		HostID:    "h1",
		TS:        "2025-01-01T00:00:00.000Z",
		Metrics:   MetricsDTO{CPUTotalPct: 50, MemUsedMB: 1024, MemTotalMB: 2048},
		Processes: procs_,
	}
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = MarshalGzip(dto)
	}
}
