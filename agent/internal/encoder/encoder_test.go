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

func TestEncodeBatchGzip_NonEmpty(t *testing.T) {
	sample := &sampler.Sample{
		TS:       time.Now().UTC(),
		Metrics:  sampler.MetricsSnapshot{CPUTotalPct: 10},
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
