package command

import (
	"encoding/json"
	"net/http"
	"os"
	"syscall"

	"go.uber.org/zap"
)

type signalRequest struct {
	PID    int    `json:"pid"`
	Signal string `json:"signal"`
}

var signalMap = map[string]syscall.Signal{
	"SIGTERM": syscall.SIGTERM,
	"SIGKILL": syscall.SIGKILL,
	"SIGINT":  syscall.SIGINT,
	"SIGHUP":  syscall.SIGHUP,
}

func Run(listenAddr, secret string, logger *zap.Logger) error {
	if secret == "" {
		logger.Info("command server disabled: no secret configured")
		return nil
	}
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
		if req.PID == 1 && (sig == syscall.SIGKILL || sig == syscall.SIGTERM) {
			http.Error(w, "refusing to signal init", http.StatusForbidden)
			return
		}
		if err := syscall.Kill(req.PID, sig); err != nil {
			logger.Warn("kill failed", zap.Int("pid", req.PID), zap.String("signal", req.Signal), zap.Error(err))
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		logger.Info("signal sent", zap.Int("pid", req.PID), zap.String("signal", req.Signal))
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
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})
	logger.Info("command server listening", zap.String("addr", listenAddr))
	return http.ListenAndServe(listenAddr, mux)
}

func RunBackground(listenAddr, secret string, logger *zap.Logger) {
	if secret == "" {
		return
	}
	go func() {
		if err := Run(listenAddr, secret, logger); err != nil && err != http.ErrServerClosed {
			logger.Error("command server failed", zap.Error(err))
			os.Exit(1)
		}
	}()
}
