package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoad_ValidYAML(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "config.yaml")
	if err := os.WriteFile(path, []byte(`
server_url: https://api.example.com
host_id: host-1
host_token: secret
interval_sec: 15
log_level: debug
`), 0644); err != nil {
		t.Fatal(err)
	}
	cfg, err := Load(path)
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if cfg.ServerURL != "https://api.example.com" {
		t.Errorf("ServerURL = %q", cfg.ServerURL)
	}
	if cfg.HostID != "host-1" {
		t.Errorf("HostID = %q", cfg.HostID)
	}
	if cfg.HostToken != "secret" {
		t.Errorf("HostToken = %q", cfg.HostToken)
	}
	if cfg.IntervalSec != 15 {
		t.Errorf("IntervalSec = %d", cfg.IntervalSec)
	}
	if cfg.LogLevel != "debug" {
		t.Errorf("LogLevel = %q", cfg.LogLevel)
	}
	if cfg.ProcessIntervalSec != 30 {
		t.Errorf("ProcessIntervalSec default = %d", cfg.ProcessIntervalSec)
	}
}

func TestLoad_EnvOverride(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "config.yaml")
	if err := os.WriteFile(path, []byte(`
server_url: https://file.example.com
host_id: file-host
host_token: file-token
`), 0644); err != nil {
		t.Fatal(err)
	}
	os.Setenv("AGENT_SERVER_URL", "https://env.example.com")
	os.Setenv("AGENT_HOST_ID", "env-host")
	os.Setenv("AGENT_INTERVAL_SEC", "20")
	defer func() {
		os.Unsetenv("AGENT_SERVER_URL")
		os.Unsetenv("AGENT_HOST_ID")
		os.Unsetenv("AGENT_INTERVAL_SEC")
	}()
	cfg, err := Load(path)
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if cfg.ServerURL != "https://env.example.com" {
		t.Errorf("ServerURL env override = %q", cfg.ServerURL)
	}
	if cfg.HostID != "env-host" {
		t.Errorf("HostID env override = %q", cfg.HostID)
	}
	if cfg.IntervalSec != 20 {
		t.Errorf("IntervalSec env override = %d", cfg.IntervalSec)
	}
}

func TestLoad_Defaults(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "minimal.yaml")
	if err := os.WriteFile(path, []byte(`
server_url: https://x.com
host_id: h1
host_token: t1
`), 0644); err != nil {
		t.Fatal(err)
	}
	cfg, err := Load(path)
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if cfg.IntervalSec != 10 {
		t.Errorf("IntervalSec default = %d", cfg.IntervalSec)
	}
	if cfg.ProcessIntervalSec != 30 {
		t.Errorf("ProcessIntervalSec default = %d", cfg.ProcessIntervalSec)
	}
	if cfg.ProcessTopN != 15 {
		t.Errorf("ProcessTopN default = %d", cfg.ProcessTopN)
	}
	if cfg.CommandListenAddr != ":9090" {
		t.Errorf("CommandListenAddr default = %q", cfg.CommandListenAddr)
	}
}

func TestLoad_MissingRequired(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "empty.yaml")
	if err := os.WriteFile(path, []byte(`
interval_sec: 5
`), 0644); err != nil {
		t.Fatal(err)
	}
	_, err := Load(path)
	if err == nil {
		t.Fatal("expected error when server_url, host_id, host_token missing")
	}
	if err.Error() != "server_url, host_id, host_token are required" {
		t.Errorf("error = %v", err)
	}
}

func TestLoad_NoFile(t *testing.T) {
	_, err := Load(filepath.Join(t.TempDir(), "nonexistent.yaml"))
	if err == nil {
		t.Fatal("expected error for missing file")
	}
}
