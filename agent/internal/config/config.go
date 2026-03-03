package config

import (
	"fmt"
	"os"
	"strings"

	"gopkg.in/yaml.v2"
)

type Config struct {
	ServerURL            string   `yaml:"server_url"`
	HostID               string   `yaml:"host_id"`
	HostToken            string   `yaml:"host_token"`
	IntervalSec          int      `yaml:"interval_sec"`
	ProcessIntervalSec   int      `yaml:"process_interval_sec"`
	LogLevel             string   `yaml:"log_level"`
	DiskPaths            []string `yaml:"disk_paths"`
	ProcessTopN          int      `yaml:"process_top_n"`
	HTTPTimeoutSec       int      `yaml:"http_timeout_sec"`
	HTTPRetries          int      `yaml:"http_retries"`
	TLSInsecureSkipVerify bool    `yaml:"tls_insecure_skip_verify"`
	TLSCACert            string   `yaml:"tls_ca_cert"`
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

func envString(key, current string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return current
}

func envInt(key string, current int) int {
	if v := os.Getenv(key); v != "" {
		var n int
		if _, err := fmt.Sscanf(v, "%d", &n); err == nil {
			return n
		}
	}
	return current
}

func envBool(key string, current bool) bool {
	if v := os.Getenv(key); v != "" {
		return v == "1" || v == "true" || v == "yes"
	}
	return current
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
	cfg.ServerURL = envString("AGENT_SERVER_URL", cfg.ServerURL)
	cfg.HostID = envString("AGENT_HOST_ID", cfg.HostID)
	cfg.HostToken = envString("AGENT_HOST_TOKEN", cfg.HostToken)
	cfg.IntervalSec = envInt("AGENT_INTERVAL_SEC", cfg.IntervalSec)
	cfg.ProcessIntervalSec = envInt("AGENT_PROCESS_INTERVAL_SEC", cfg.ProcessIntervalSec)
	cfg.LogLevel = envString("AGENT_LOG_LEVEL", cfg.LogLevel)
	cfg.HTTPTimeoutSec = envInt("AGENT_HTTP_TIMEOUT_SEC", cfg.HTTPTimeoutSec)
	cfg.HTTPRetries = envInt("AGENT_HTTP_RETRIES", cfg.HTTPRetries)
	cfg.TLSInsecureSkipVerify = envBool("AGENT_TLS_INSECURE_SKIP_VERIFY", cfg.TLSInsecureSkipVerify)
	cfg.TLSCACert = envString("AGENT_TLS_CA_CERT", cfg.TLSCACert)
	cfg.CommandListenAddr = envString("AGENT_COMMAND_LISTEN_ADDR", cfg.CommandListenAddr)
	cfg.CommandSecret = envString("AGENT_COMMAND_SECRET", cfg.CommandSecret)
	if s := os.Getenv("AGENT_DISK_PATHS"); s != "" {
		cfg.DiskPaths = strings.Split(s, ",")
		for i := range cfg.DiskPaths {
			cfg.DiskPaths[i] = strings.TrimSpace(cfg.DiskPaths[i])
		}
	}
	if n := envInt("AGENT_PROCESS_TOP_N", cfg.ProcessTopN); n > 0 {
		cfg.ProcessTopN = n
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
	if cfg.CommandListenAddr == "" {
		cfg.CommandListenAddr = ":9090"
	}
	return cfg, nil
}
