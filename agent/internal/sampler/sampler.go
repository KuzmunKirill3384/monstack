package sampler

import (
	"context"
	"math/rand"
	"time"

	"monagent/internal/collectors"
	"monagent/internal/config"
	"monagent/internal/procs"

	"go.uber.org/zap"
)

type MetricsSnapshot struct {
	CPUTotalPct  float64
	Load1        float64
	Load5        float64
	Load15       float64
	MemUsedMB    float64
	MemTotalMB   float64
	DiskUsedPct  float64
	NetRxBps     uint64
	NetTxBps     uint64
}

type Sample struct {
	TS       time.Time
	Metrics  MetricsSnapshot
	Processes []procs.ProcInfo
}

type Sampler struct {
	cfg    *config.Config
	logger *zap.Logger

	prevCPU    *collectors.CPUStats
	prevNet    *collectors.NetStats
	prevProcs  map[int]procs.ProcRaw
	lastProcAt time.Time
}

func New(cfg *config.Config, logger *zap.Logger) *Sampler {
	return &Sampler{cfg: cfg, logger: logger, prevProcs: make(map[int]procs.ProcRaw)}
}

func (s *Sampler) Sample(ctx context.Context) (*Sample, error) {
	now := time.Now().UTC()

	cpuCur, err := collectors.ReadCPUStat()
	if err != nil {
		return nil, err
	}
	cpuPct := 0.0
	if s.prevCPU != nil {
		cpuPct = collectors.CPUPercent(s.prevCPU, cpuCur)
	}
	s.prevCPU = cpuCur

	load1, load5, load15, err := collectors.ReadLoadavg()
	if err != nil {
		return nil, err
	}

	totalKB, availKB, err := collectors.ReadMeminfo()
	if err != nil {
		return nil, err
	}
	usedMB, totalMB := collectors.MemUsedMB(totalKB, availKB)

	diskPct, err := collectors.DiskUsedPctFirst(s.cfg.DiskPaths)
	if err != nil {
		diskPct = 0
	}

	netCur, err := collectors.ReadNetDev()
	if err != nil {
		return nil, err
	}
	intervalSec := float64(s.cfg.IntervalSec)
	if intervalSec <= 0 {
		intervalSec = 10
	}
	netRxBps, netTxBps := uint64(0), uint64(0)
	if s.prevNet != nil {
		netRxBps, netTxBps = collectors.NetBps(s.prevNet, netCur, intervalSec)
	}
	s.prevNet = netCur

	metrics := MetricsSnapshot{
		CPUTotalPct: cpuPct,
		Load1:       load1, Load5: load5, Load15: load15,
		MemUsedMB:   usedMB, MemTotalMB: totalMB,
		DiskUsedPct: diskPct,
		NetRxBps:    netRxBps, NetTxBps: netTxBps,
	}

	var procsList []procs.ProcInfo
	if s.shouldSampleProcs(now) {
		procsList, s.prevProcs, err = procs.TopN(s.prevProcs, float64(s.cfg.ProcessIntervalSec), s.cfg.ProcessTopN)
		if err != nil {
			s.logger.Warn("procs sample failed", zap.Error(err))
		} else {
			s.lastProcAt = now
			s.logger.Debug("procs sampled", zap.Int("count", len(procsList)))
		}
	}

	return &Sample{TS: now, Metrics: metrics, Processes: procsList}, nil
}

func (s *Sampler) shouldSampleProcs(now time.Time) bool {
	return now.Sub(s.lastProcAt) >= time.Duration(s.cfg.ProcessIntervalSec)*time.Second
}

func (s *Sampler) NextTick(ctx context.Context) <-chan time.Time {
	out := make(chan time.Time, 1)
	interval := time.Duration(s.cfg.IntervalSec) * time.Second
	jitter := time.Duration(rand.Intn(2000)+1) * time.Millisecond
	first := interval + jitter
	go func() {
		timer := time.NewTimer(first)
		defer timer.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case t := <-timer.C:
				select {
				case out <- t:
				default:
				}
				jitter = time.Duration(rand.Intn(2000)+1) * time.Millisecond
				timer.Reset(interval + jitter)
			}
		}
	}()
	return out
}
