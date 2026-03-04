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
	t.Setenv("AGENT_SERVER_URL", "https://env.example.com")
	t.Setenv("AGENT_HOST_ID", "env-host")
	t.Setenv("AGENT_INTERVAL_SEC", "20")
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
	if cfg.HTTPTimeoutSec != 30 {
		t.Errorf("HTTPTimeoutSec default = %d", cfg.HTTPTimeoutSec)
	}
	if cfg.HTTPRetries != 3 {
		t.Errorf("HTTPRetries default = %d", cfg.HTTPRetries)
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

func TestLoad_NegativeIntervals(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "neg.yaml")
	if err := os.WriteFile(path, []byte(`
server_url: https://x.com
host_id: h1
host_token: t1
interval_sec: -5
process_interval_sec: -10
process_top_n: -1
`), 0644); err != nil {
		t.Fatal(err)
	}
	cfg, err := Load(path)
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if cfg.IntervalSec <= 0 {
		t.Errorf("IntervalSec should be positive, got %d", cfg.IntervalSec)
	}
	if cfg.ProcessIntervalSec <= 0 {
		t.Errorf("ProcessIntervalSec should be positive, got %d", cfg.ProcessIntervalSec)
	}
	if cfg.ProcessTopN <= 0 {
		t.Errorf("ProcessTopN should be positive, got %d", cfg.ProcessTopN)
	}
}

func TestLoad_DiskPathsEnv(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "dp.yaml")
	if err := os.WriteFile(path, []byte(`
server_url: https://x.com
host_id: h1
host_token: t1
`), 0644); err != nil {
		t.Fatal(err)
	}
	t.Setenv("AGENT_DISK_PATHS", "/mnt/data, /mnt/backup , /home")
	cfg, err := Load(path)
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if len(cfg.DiskPaths) != 3 {
		t.Fatalf("DiskPaths len = %d, want 3", len(cfg.DiskPaths))
	}
	if cfg.DiskPaths[0] != "/mnt/data" {
		t.Errorf("DiskPaths[0] = %q", cfg.DiskPaths[0])
	}
	if cfg.DiskPaths[1] != "/mnt/backup" {
		t.Errorf("DiskPaths[1] = %q (should be trimmed)", cfg.DiskPaths[1])
	}
	if cfg.DiskPaths[2] != "/home" {
		t.Errorf("DiskPaths[2] = %q", cfg.DiskPaths[2])
	}
}

func TestLoad_ProcessTopNEnv(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "topn.yaml")
	if err := os.WriteFile(path, []byte(`
server_url: https://x.com
host_id: h1
host_token: t1
`), 0644); err != nil {
		t.Fatal(err)
	}
	t.Setenv("AGENT_PROCESS_TOP_N", "25")
	cfg, err := Load(path)
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if cfg.ProcessTopN != 25 {
		t.Errorf("ProcessTopN = %d, want 25", cfg.ProcessTopN)
	}
}

func TestLoad_CommandSecretEnv(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "cmd.yaml")
	if err := os.WriteFile(path, []byte(`
server_url: https://x.com
host_id: h1
host_token: t1
command_secret: yaml-secret
`), 0644); err != nil {
		t.Fatal(err)
	}
	t.Setenv("AGENT_COMMAND_SECRET", "env-secret")
	cfg, err := Load(path)
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if cfg.CommandSecret != "env-secret" {
		t.Errorf("CommandSecret = %q, want env-secret", cfg.CommandSecret)
	}
}

func TestLoad_TLSInsecureEnv(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "tls.yaml")
	if err := os.WriteFile(path, []byte(`
server_url: https://x.com
host_id: h1
host_token: t1
`), 0644); err != nil {
		t.Fatal(err)
	}
	t.Setenv("AGENT_TLS_INSECURE_SKIP_VERIFY", "true")
	cfg, err := Load(path)
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if !cfg.TLSInsecureSkipVerify {
		t.Error("TLSInsecureSkipVerify should be true from env")
	}
}

func TestLoad_AllFieldsFromYAML(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "full.yaml")
	if err := os.WriteFile(path, []byte(`
server_url: https://full.example.com
host_id: full-host
host_token: full-token
interval_sec: 5
process_interval_sec: 15
log_level: warn
disk_paths:
  - /data
  - /home
process_top_n: 30
http_timeout_sec: 60
http_retries: 5
tls_insecure_skip_verify: true
tls_ca_cert: /etc/ca.pem
command_listen_addr: ":8080"
command_secret: my-secret
`), 0644); err != nil {
		t.Fatal(err)
	}
	cfg, err := Load(path)
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if cfg.ServerURL != "https://full.example.com" {
		t.Errorf("ServerURL = %q", cfg.ServerURL)
	}
	if cfg.IntervalSec != 5 {
		t.Errorf("IntervalSec = %d", cfg.IntervalSec)
	}
	if cfg.ProcessIntervalSec != 15 {
		t.Errorf("ProcessIntervalSec = %d", cfg.ProcessIntervalSec)
	}
	if cfg.LogLevel != "warn" {
		t.Errorf("LogLevel = %q", cfg.LogLevel)
	}
	if len(cfg.DiskPaths) != 2 || cfg.DiskPaths[0] != "/data" {
		t.Errorf("DiskPaths = %v", cfg.DiskPaths)
	}
	if cfg.ProcessTopN != 30 {
		t.Errorf("ProcessTopN = %d", cfg.ProcessTopN)
	}
	if cfg.HTTPTimeoutSec != 60 {
		t.Errorf("HTTPTimeoutSec = %d", cfg.HTTPTimeoutSec)
	}
	if cfg.HTTPRetries != 5 {
		t.Errorf("HTTPRetries = %d", cfg.HTTPRetries)
	}
	if !cfg.TLSInsecureSkipVerify {
		t.Error("TLSInsecureSkipVerify")
	}
	if cfg.TLSCACert != "/etc/ca.pem" {
		t.Errorf("TLSCACert = %q", cfg.TLSCACert)
	}
	if cfg.CommandListenAddr != ":8080" {
		t.Errorf("CommandListenAddr = %q", cfg.CommandListenAddr)
	}
	if cfg.CommandSecret != "my-secret" {
		t.Errorf("CommandSecret = %q", cfg.CommandSecret)
	}
}

func TestDefault(t *testing.T) {
	d := Default()
	if d.IntervalSec != 10 || d.ProcessIntervalSec != 30 || d.ProcessTopN != 15 {
		t.Errorf("Default() = %+v", d)
	}
	if d.CommandListenAddr != ":9090" {
		t.Errorf("CommandListenAddr default = %q", d.CommandListenAddr)
	}
}

func TestLoad_InvalidYAML(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "bad.yaml")
	if err := os.WriteFile(path, []byte(`{{{invalid yaml content`), 0644); err != nil {
		t.Fatal(err)
	}
	_, err := Load(path)
	if err == nil {
		t.Fatal("expected error for invalid YAML")
	}
}
