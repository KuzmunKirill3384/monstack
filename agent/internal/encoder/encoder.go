package encoder

import (
	"bytes"
	"compress/gzip"
	"encoding/json"

	"monagent/internal/sampler"
)

type MetricsDTO struct {
	CPUTotalPct  float64 `json:"cpu_total_pct"`
	Load1        float64 `json:"load1"`
	Load5        float64 `json:"load5"`
	Load15       float64 `json:"load15"`
	MemUsedMB    float64 `json:"mem_used_mb"`
	MemTotalMB   float64 `json:"mem_total_mb"`
	DiskUsedPct  float64 `json:"disk_used_pct"`
	NetRxBps     uint64  `json:"net_rx_bps"`
	NetTxBps     uint64  `json:"net_tx_bps"`
}

type ProcessDTO struct {
	PID        int     `json:"pid"`
	Name       string  `json:"name"`
	CPUPercent float64 `json:"cpu_pct"`
	RSSMB      float64 `json:"rss_mb"`
	IOReadBps  uint64  `json:"io_read_bps"`
	IOWriteBps uint64  `json:"io_write_bps"`
	State      string  `json:"state"`
}

type IngestBatchDTO struct {
	HostID    string        `json:"host_id"`
	TS        string        `json:"ts"`
	Metrics   MetricsDTO    `json:"metrics"`
	Processes []ProcessDTO  `json:"processes,omitempty"`
}

func EncodeBatch(hostID string, sample *sampler.Sample) (*IngestBatchDTO, error) {
	dto := &IngestBatchDTO{
		HostID: hostID,
		TS:     sample.TS.Format("2006-01-02T15:04:05.000Z07:00"),
		Metrics: MetricsDTO{
			CPUTotalPct: sample.Metrics.CPUTotalPct,
			Load1:       sample.Metrics.Load1,
			Load5:       sample.Metrics.Load5,
			Load15:      sample.Metrics.Load15,
			MemUsedMB:   sample.Metrics.MemUsedMB,
			MemTotalMB:  sample.Metrics.MemTotalMB,
			DiskUsedPct: sample.Metrics.DiskUsedPct,
			NetRxBps:    sample.Metrics.NetRxBps,
			NetTxBps:    sample.Metrics.NetTxBps,
		},
	}
	for _, p := range sample.Processes {
		dto.Processes = append(dto.Processes, ProcessDTO{
			PID:        p.PID,
			Name:       p.Name,
			CPUPercent: p.CPUPercent,
			RSSMB:      p.RSSMB,
			IOReadBps:  p.IOReadBps,
			IOWriteBps: p.IOWriteBps,
			State:      p.State,
		})
	}
	return dto, nil
}

func MarshalGzip(dto *IngestBatchDTO) ([]byte, error) {
	raw, err := json.Marshal(dto)
	if err != nil {
		return nil, err
	}
	var buf bytes.Buffer
	w := gzip.NewWriter(&buf)
	if _, err := w.Write(raw); err != nil {
		_ = w.Close()
		return nil, err
	}
	if err := w.Close(); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func EncodeBatchGzip(hostID string, sample *sampler.Sample) ([]byte, error) {
	return EncodeBatchGzipMaxProcs(hostID, sample, 0)
}

func EncodeBatchGzipMaxProcs(hostID string, sample *sampler.Sample, maxProcs int) ([]byte, error) {
	dto, err := EncodeBatchMaxProcs(hostID, sample, maxProcs)
	if err != nil {
		return nil, err
	}
	return MarshalGzip(dto)
}

func EncodeBatchMaxProcs(hostID string, sample *sampler.Sample, maxProcs int) (*IngestBatchDTO, error) {
	dto, err := EncodeBatch(hostID, sample)
	if err != nil {
		return nil, err
	}
	if maxProcs > 0 && len(dto.Processes) > maxProcs {
		dto.Processes = dto.Processes[:maxProcs]
	}
	return dto, nil
}
