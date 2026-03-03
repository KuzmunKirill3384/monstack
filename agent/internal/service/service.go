package service

import (
	"context"
	"sync/atomic"

	"monagent/internal/config"
	"monagent/internal/encoder"
	"monagent/internal/sampler"
	"monagent/internal/transport"

	"go.uber.org/zap"
)

type Service struct {
	cfg       *config.Config
	logger    *zap.Logger
	sampler   *sampler.Sampler
	transport *transport.Client
	maxProcs  atomic.Int32
}

func New(cfg *config.Config, logger *zap.Logger) (*Service, error) {
	sam := sampler.New(cfg, logger)
	client := transport.New(cfg.ServerURL, cfg.HostToken, cfg.HTTPTimeoutSec, cfg.HTTPRetries, cfg.TLSInsecureSkipVerify, cfg.TLSCACert, logger)
	svc := &Service{
		cfg:       cfg,
		logger:    logger,
		sampler:   sam,
		transport: client,
	}
	svc.maxProcs.Store(int32(cfg.ProcessTopN))
	return svc, nil
}

func (s *Service) Run(ctx context.Context) error {
	tickCh := s.sampler.NextTick(ctx)
	for {
		select {
		case <-ctx.Done():
			return nil
		case <-tickCh:
			sample, err := s.sampler.Sample(ctx)
			if err != nil {
				s.logger.Warn("sample failed", zap.Error(err))
				continue
			}
			limit := int(s.maxProcs.Load())
			if limit <= 0 {
				limit = s.cfg.ProcessTopN
				s.maxProcs.Store(int32(limit))
			}
			body, err := encoder.EncodeBatchGzipMaxProcs(s.cfg.HostID, sample, limit)
			if err != nil {
				s.logger.Warn("encode failed", zap.Error(err))
				continue
			}
			if err := s.transport.SendIngest(body); err != nil {
				if err == transport.ErrPayloadTooLarge {
					next := limit / 2
					if next < 1 {
						next = 1
					}
					s.maxProcs.Store(int32(next))
					s.logger.Warn("reducing batch size after 413", zap.Int("max_procs", next))
				} else {
					s.logger.Warn("ingest failed", zap.Error(err))
				}
				continue
			}
			s.maxProcs.Store(int32(s.cfg.ProcessTopN))
			s.logger.Debug("ingest sent")
		}
	}
}
