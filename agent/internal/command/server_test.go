package command

import (
	"bytes"
	"context"
	"encoding/json"
	"net"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"go.uber.org/zap"
)

func handler(t *testing.T, secret string) http.Handler {
	t.Helper()
	selfPID := 999999
	mux := http.NewServeMux()
	mux.HandleFunc("/signal", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		got := r.Header.Get("X-Agent-Secret")
		if got != secret {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
		var req signalRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid json", http.StatusBadRequest)
			return
		}
		sig, ok := signalMap[req.Signal]
		if !ok {
			http.Error(w, "invalid signal: "+req.Signal, http.StatusBadRequest)
			return
		}
		if req.PID <= 0 {
			http.Error(w, "invalid pid", http.StatusBadRequest)
			return
		}
		if req.PID == 1 && (sig == 15 || sig == 9) {
			http.Error(w, "refusing to signal init", http.StatusForbidden)
			return
		}
		if req.PID == selfPID {
			http.Error(w, "refusing to signal self", http.StatusForbidden)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"ok":true}`))
	})
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})
	return mux
}

func TestHealth(t *testing.T) {
	srv := httptest.NewServer(handler(t, "sec"))
	defer srv.Close()
	resp, err := http.Get(srv.URL + "/health")
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		t.Errorf("status = %d", resp.StatusCode)
	}
}

func TestHealth_WrongMethod(t *testing.T) {
	srv := httptest.NewServer(handler(t, "sec"))
	defer srv.Close()
	resp, err := http.Post(srv.URL+"/health", "application/json", nil)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusMethodNotAllowed {
		t.Errorf("expected 405, got %d", resp.StatusCode)
	}
}

func TestSignal_NoSecret(t *testing.T) {
	srv := httptest.NewServer(handler(t, "sec"))
	defer srv.Close()
	body, _ := json.Marshal(signalRequest{PID: 1234, Signal: "SIGTERM"})
	resp, err := http.Post(srv.URL+"/signal", "application/json", bytes.NewReader(body))
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusForbidden {
		t.Errorf("expected 403 without secret, got %d", resp.StatusCode)
	}
}

func TestSignal_WrongSecret(t *testing.T) {
	srv := httptest.NewServer(handler(t, "correct-secret"))
	defer srv.Close()
	body, _ := json.Marshal(signalRequest{PID: 1234, Signal: "SIGTERM"})
	req, _ := http.NewRequest(http.MethodPost, srv.URL+"/signal", bytes.NewReader(body))
	req.Header.Set("X-Agent-Secret", "wrong-secret")
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusForbidden {
		t.Errorf("expected 403 with wrong secret, got %d", resp.StatusCode)
	}
}

func TestSignal_BadMethod(t *testing.T) {
	srv := httptest.NewServer(handler(t, "sec"))
	defer srv.Close()
	resp, err := http.Get(srv.URL + "/signal")
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusMethodNotAllowed {
		t.Errorf("expected 405, got %d", resp.StatusCode)
	}
}

func TestSignal_InvalidSignal(t *testing.T) {
	srv := httptest.NewServer(handler(t, "sec"))
	defer srv.Close()
	body, _ := json.Marshal(signalRequest{PID: 1234, Signal: "SIGFOO"})
	req, _ := http.NewRequest(http.MethodPost, srv.URL+"/signal", bytes.NewReader(body))
	req.Header.Set("X-Agent-Secret", "sec")
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid signal, got %d", resp.StatusCode)
	}
}

func TestSignal_InvalidPID(t *testing.T) {
	srv := httptest.NewServer(handler(t, "sec"))
	defer srv.Close()
	body, _ := json.Marshal(signalRequest{PID: -1, Signal: "SIGTERM"})
	req, _ := http.NewRequest(http.MethodPost, srv.URL+"/signal", bytes.NewReader(body))
	req.Header.Set("X-Agent-Secret", "sec")
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", resp.StatusCode)
	}
}

func TestSignal_ZeroPID(t *testing.T) {
	srv := httptest.NewServer(handler(t, "sec"))
	defer srv.Close()
	body, _ := json.Marshal(signalRequest{PID: 0, Signal: "SIGTERM"})
	req, _ := http.NewRequest(http.MethodPost, srv.URL+"/signal", bytes.NewReader(body))
	req.Header.Set("X-Agent-Secret", "sec")
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("expected 400 for PID=0, got %d", resp.StatusCode)
	}
}

func TestSignal_InitProtection_SIGKILL(t *testing.T) {
	srv := httptest.NewServer(handler(t, "sec"))
	defer srv.Close()
	body, _ := json.Marshal(signalRequest{PID: 1, Signal: "SIGKILL"})
	req, _ := http.NewRequest(http.MethodPost, srv.URL+"/signal", bytes.NewReader(body))
	req.Header.Set("X-Agent-Secret", "sec")
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusForbidden {
		t.Errorf("expected 403 for init SIGKILL, got %d", resp.StatusCode)
	}
}

func TestSignal_InitProtection_SIGTERM(t *testing.T) {
	srv := httptest.NewServer(handler(t, "sec"))
	defer srv.Close()
	body, _ := json.Marshal(signalRequest{PID: 1, Signal: "SIGTERM"})
	req, _ := http.NewRequest(http.MethodPost, srv.URL+"/signal", bytes.NewReader(body))
	req.Header.Set("X-Agent-Secret", "sec")
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusForbidden {
		t.Errorf("expected 403 for init SIGTERM, got %d", resp.StatusCode)
	}
}

func TestSignal_SelfProtection(t *testing.T) {
	srv := httptest.NewServer(handler(t, "sec"))
	defer srv.Close()
	body, _ := json.Marshal(signalRequest{PID: 999999, Signal: "SIGTERM"})
	req, _ := http.NewRequest(http.MethodPost, srv.URL+"/signal", bytes.NewReader(body))
	req.Header.Set("X-Agent-Secret", "sec")
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusForbidden {
		t.Errorf("expected 403 for self-signal, got %d", resp.StatusCode)
	}
}

func TestSignal_InvalidJSON(t *testing.T) {
	srv := httptest.NewServer(handler(t, "sec"))
	defer srv.Close()
	req, _ := http.NewRequest(http.MethodPost, srv.URL+"/signal", bytes.NewReader([]byte("{bad json")))
	req.Header.Set("X-Agent-Secret", "sec")
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid JSON, got %d", resp.StatusCode)
	}
}

func TestSignal_ValidRequest(t *testing.T) {
	srv := httptest.NewServer(handler(t, "sec"))
	defer srv.Close()
	body, _ := json.Marshal(signalRequest{PID: 12345, Signal: "SIGTERM"})
	req, _ := http.NewRequest(http.MethodPost, srv.URL+"/signal", bytes.NewReader(body))
	req.Header.Set("X-Agent-Secret", "sec")
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}
}

func TestSignal_AllSupportedSignals(t *testing.T) {
	srv := httptest.NewServer(handler(t, "sec"))
	defer srv.Close()
	for sig := range signalMap {
		body, _ := json.Marshal(signalRequest{PID: 12345, Signal: sig})
		req, _ := http.NewRequest(http.MethodPost, srv.URL+"/signal", bytes.NewReader(body))
		req.Header.Set("X-Agent-Secret", "sec")
		req.Header.Set("Content-Type", "application/json")
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatalf("signal %s: %v", sig, err)
		}
		resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			t.Errorf("signal %s: expected 200, got %d", sig, resp.StatusCode)
		}
	}
}

func TestRunBackground_NoSecret(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	logger := zap.NewNop()
	RunBackground(ctx, ":0", "", logger)
}

func TestRunBackground_GracefulShutdown(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	logger := zap.NewNop()
	RunBackground(ctx, ":0", "test-secret", logger)
	time.Sleep(50 * time.Millisecond)
	cancel()
	time.Sleep(100 * time.Millisecond)
}

func TestRun_EmptySecret(t *testing.T) {
	ctx := context.Background()
	logger := zap.NewNop()
	err := Run(ctx, ":0", "", logger)
	if err != nil {
		t.Errorf("Run with empty secret should return nil, got %v", err)
	}
}

func TestRun_GracefulShutdown(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	logger := zap.NewNop()
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	addr := ln.Addr().String()
	ln.Close()

	done := make(chan error, 1)
	go func() {
		done <- Run(ctx, addr, "test", logger)
	}()

	time.Sleep(50 * time.Millisecond)
	cancel()

	select {
	case err := <-done:
		if err != nil {
			t.Errorf("Run should return nil after shutdown, got %v", err)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("Run did not stop within timeout")
	}
}
