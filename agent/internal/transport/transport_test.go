package transport

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"go.uber.org/zap"
)

func TestClient_SendIngest_204(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost || r.URL.Path != "/v1/ingest" {
			t.Errorf("method=%s path=%s", r.Method, r.URL.Path)
		}
		if r.Header.Get("Authorization") != "Bearer tok" {
			t.Errorf("Authorization = %q", r.Header.Get("Authorization"))
		}
		if r.Header.Get("Content-Encoding") != "gzip" {
			t.Errorf("Content-Encoding = %q", r.Header.Get("Content-Encoding"))
		}
		w.WriteHeader(http.StatusNoContent)
	}))
	defer srv.Close()

	logger := zap.NewNop()
	client := New(srv.URL, "tok", 10, 2, false, "", logger)
	err := client.SendIngest([]byte("gzip-body"))
	if err != nil {
		t.Fatalf("SendIngest: %v", err)
	}
}

func TestClient_SendIngest_200(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	logger := zap.NewNop()
	client := New(srv.URL, "t", 10, 2, false, "", logger)
	err := client.SendIngest([]byte("x"))
	if err != nil {
		t.Fatalf("SendIngest: %v", err)
	}
}

func TestClient_SendIngest_413_NoRetry(t *testing.T) {
	attempts := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		attempts++
		w.WriteHeader(http.StatusRequestEntityTooLarge)
	}))
	defer srv.Close()

	logger := zap.NewNop()
	client := New(srv.URL, "t", 10, 3, false, "", logger)
	err := client.SendIngest([]byte("big"))
	if err != ErrPayloadTooLarge {
		t.Fatalf("expected ErrPayloadTooLarge, got %v", err)
	}
	if attempts != 1 {
		t.Errorf("413 should not retry: expected 1 attempt, got %d", attempts)
	}
}

func TestClient_SendIngest_401_NoRetry(t *testing.T) {
	attempts := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		attempts++
		w.WriteHeader(http.StatusUnauthorized)
	}))
	defer srv.Close()

	logger := zap.NewNop()
	client := New(srv.URL, "bad-token", 10, 3, false, "", logger)
	err := client.SendIngest([]byte("x"))
	if err == nil {
		t.Fatal("expected error for 401")
	}
	if !strings.Contains(err.Error(), "401") {
		t.Errorf("error should mention 401: %v", err)
	}
	if attempts != 1 {
		t.Errorf("401 should not retry: expected 1 attempt, got %d", attempts)
	}
}

func TestClient_SendIngest_403_NoRetry(t *testing.T) {
	attempts := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		attempts++
		w.WriteHeader(http.StatusForbidden)
	}))
	defer srv.Close()

	logger := zap.NewNop()
	client := New(srv.URL, "t", 10, 3, false, "", logger)
	err := client.SendIngest([]byte("x"))
	if err == nil {
		t.Fatal("expected error for 403")
	}
	if attempts != 1 {
		t.Errorf("403 should not retry: expected 1 attempt, got %d", attempts)
	}
}

func TestClient_SendIngest_400_NoRetry(t *testing.T) {
	attempts := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		attempts++
		w.WriteHeader(http.StatusBadRequest)
	}))
	defer srv.Close()

	logger := zap.NewNop()
	client := New(srv.URL, "t", 10, 3, false, "", logger)
	err := client.SendIngest([]byte("x"))
	if err == nil {
		t.Fatal("expected error for 400")
	}
	if attempts != 1 {
		t.Errorf("400 should not retry: expected 1 attempt, got %d", attempts)
	}
}

func TestClient_SendIngest_5xxRetries(t *testing.T) {
	attempts := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		attempts++
		if attempts < 2 {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}))
	defer srv.Close()

	logger := zap.NewNop()
	client := New(srv.URL, "t", 10, 3, false, "", logger)
	err := client.SendIngest([]byte("x"))
	if err != nil {
		t.Fatalf("SendIngest after retry: %v", err)
	}
	if attempts != 2 {
		t.Errorf("expected 2 attempts, got %d", attempts)
	}
}

func TestClient_SendIngest_502Retries(t *testing.T) {
	attempts := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		attempts++
		if attempts < 3 {
			w.WriteHeader(http.StatusBadGateway)
			return
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	logger := zap.NewNop()
	client := New(srv.URL, "t", 10, 3, false, "", logger)
	err := client.SendIngest([]byte("x"))
	if err != nil {
		t.Fatalf("SendIngest after retry: %v", err)
	}
	if attempts != 3 {
		t.Errorf("expected 3 attempts, got %d", attempts)
	}
}

func TestClient_SendIngest_AllRetriesFail(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusServiceUnavailable)
	}))
	defer srv.Close()

	logger := zap.NewNop()
	client := New(srv.URL, "t", 10, 2, false, "", logger)
	err := client.SendIngest([]byte("x"))
	if err == nil {
		t.Fatal("expected error after all retries fail")
	}
	if !strings.Contains(err.Error(), "503") {
		t.Errorf("expected 503 in error, got: %v", err)
	}
}

func TestClient_SendIngest_Timeout(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(2 * time.Second)
		w.WriteHeader(http.StatusNoContent)
	}))
	defer srv.Close()

	logger := zap.NewNop()
	client := New(srv.URL, "t", 1, 1, false, "", logger)
	err := client.SendIngest([]byte("x"))
	if err == nil {
		t.Fatal("expected timeout error")
	}
}

func TestClient_SendIngest_BaseURLTrailingSlash(t *testing.T) {
	var path string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path = r.URL.Path
		w.WriteHeader(http.StatusNoContent)
	}))
	defer srv.Close()

	logger := zap.NewNop()
	client := New(srv.URL+"/", "t", 10, 1, false, "", logger)
	err := client.SendIngest([]byte("x"))
	if err != nil {
		t.Fatalf("SendIngest: %v", err)
	}
	if path != "/v1/ingest" {
		t.Errorf("path = %q", path)
	}
}

func TestNew_DefaultTimeoutAndRetries(t *testing.T) {
	logger := zap.NewNop()
	c := New("http://localhost", "t", 0, 0, false, "", logger)
	if c.timeout != 30*time.Second {
		t.Errorf("default timeout = %v", c.timeout)
	}
	if c.retries != 3 {
		t.Errorf("default retries = %d", c.retries)
	}
}

func TestNew_NegativeTimeoutAndRetries(t *testing.T) {
	logger := zap.NewNop()
	c := New("http://localhost", "t", -1, -1, false, "", logger)
	if c.timeout != 30*time.Second {
		t.Errorf("negative timeout = %v", c.timeout)
	}
	if c.retries != 3 {
		t.Errorf("negative retries = %d", c.retries)
	}
}

func TestNew_InsecureSkipVerify(t *testing.T) {
	logger := zap.NewNop()
	c := New("https://localhost", "t", 10, 1, true, "", logger)
	tr := c.httpClient.Transport.(*http.Transport)
	if !tr.TLSClientConfig.InsecureSkipVerify {
		t.Error("InsecureSkipVerify should be true")
	}
}

func TestNew_InvalidCACert(t *testing.T) {
	logger := zap.NewNop()
	c := New("https://localhost", "t", 10, 1, false, "/nonexistent/ca.pem", logger)
	if c == nil {
		t.Fatal("client should not be nil even with bad CA path")
	}
}
