package main

import (
	"context"
	"flag"
	"os"
	"os/signal"
	"syscall"

	"monagent/internal/command"
	"monagent/internal/config"
	"monagent/internal/service"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

func main() {
	configPath := flag.String("config", "/etc/monagent/config.yaml", "path to config file")
	flag.Parse()

	cfg, err := config.Load(*configPath)
	if err != nil {
		// fallback logger if config failed before zap init
		zap.L().Fatal("load config", zap.Error(err))
	}

	var level zapcore.Level
	if err := level.UnmarshalText([]byte(cfg.LogLevel)); err != nil {
		level = zapcore.InfoLevel
	}
	zapCfg := zap.NewProductionConfig()
	zapCfg.Level = zap.NewAtomicLevelAt(level)
	logger, err := zapCfg.Build()
	if err != nil {
		panic(err)
	}
	defer logger.Sync()
	zap.ReplaceGlobals(logger)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGTERM, syscall.SIGINT)
	go func() {
		<-sigCh
		logger.Info("shutdown signal received")
		cancel()
	}()

	command.RunBackground(cfg.CommandListenAddr, cfg.CommandSecret, logger)

	svc, err := service.New(cfg, logger)
	if err != nil {
		logger.Fatal("create service", zap.Error(err))
	}

	if err := svc.Run(ctx); err != nil && ctx.Err() == nil {
		logger.Fatal("service run", zap.Error(err))
	}
	logger.Info("agent stopped")
}
