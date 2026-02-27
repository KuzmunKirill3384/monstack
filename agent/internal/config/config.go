package config

import (
	"fmt"
	"os"

	"gopkg.in/yaml.v2"
)

type Config struct {
	ServerURL           string   `yaml:"server_url"`
	HostID              string   `yaml:"host_id"`
	HostToken           string   `yaml:"host_token"`
	IntervalSec         int      `yaml:"interval_sec"`
	ProcessIntervalSec  int      `yaml:"process_interval_sec"`
	LogLevel            string   `yaml:"log_level"`
	DiskPaths           []string `yaml:"disk_paths"`
	ProcessTopN         int      `yaml:"process_top_n"`
	HTTPTimeoutSec      int      `yaml:"http_timeout_sec"`
	HTTPRetries         int      `yaml:"http_retries"`
	CommandListenAddr   string   `yaml:"command_listen_addr"`
	CommandSecret       string   `yaml:"command_secret"`
}

func Default() *Config {
	return &Config{
		IntervalSec:        10,
		ProcessIntervalSec: 30,
		LogLevel:           "info",
		DiskPaths:          []string{"/"},
		ProcessTopN:        15,
		HTTPTimeoutSec:    30,
		HTTPRetries:        3,
		CommandListenAddr: ":9090",
		CommandSecret:      "",
	}
}

func Load(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read config: %w", err)
	}
	cfg := Default()
	if err := yaml.Unmarshal(data, cfg); err != nil {
		return nil, fmt.Errorf("parse config: %w", err)
	}
	if cfg.ServerURL == "" || cfg.HostID == "" || cfg.HostToken == "" {
		return nil, fmt.Errorf("server_url, host_id, host_token are required")
	}
	if cfg.IntervalSec <= 0 {
		cfg.IntervalSec = 10
	}
	if cfg.ProcessIntervalSec <= 0 {
		cfg.ProcessIntervalSec = 30
	}
	if cfg.ProcessTopN <= 0 {
		cfg.ProcessTopN = 15
	}
	if cfg.CommandSecret == "" {
		cfg.CommandSecret = os.Getenv("AGENT_COMMAND_SECRET")
	}
	if cfg.CommandListenAddr == "" {
		cfg.CommandListenAddr = ":9090"
	}
	return cfg, nil
}
