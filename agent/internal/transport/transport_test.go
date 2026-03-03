package transport

import (
	"net/http"
	"net/http/httptest"
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

func TestClient_SendIngest_413(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusRequestEntityTooLarge)
	}))
	defer srv.Close()

	logger := zap.NewNop()
	client := New(srv.URL, "t", 10, 2, false, "", logger)
	err := client.SendIngest([]byte("big"))
	if err != ErrPayloadTooLarge {
		t.Fatalf("expected ErrPayloadTooLarge, got %v", err)
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
