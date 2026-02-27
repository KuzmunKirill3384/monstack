package transport

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"go.uber.org/zap"
)

var ErrPayloadTooLarge = errors.New("ingest payload too large (413)")

type Client struct {
	baseURL    string
	token      string
	timeout    time.Duration
	retries    int
	httpClient *http.Client
	logger     *zap.Logger
}

func New(baseURL, token string, timeoutSec, retries int, logger *zap.Logger) *Client {
	if timeoutSec <= 0 {
		timeoutSec = 30
	}
	if retries <= 0 {
		retries = 3
	}
	return &Client{
		baseURL: baseURL,
		token:   token,
		timeout: time.Duration(timeoutSec) * time.Second,
		retries: retries,
		httpClient: &http.Client{
			Timeout: time.Duration(timeoutSec) * time.Second,
		},
		logger: logger,
	}
}

func (c *Client) SendIngest(body []byte) error {
	url := strings.TrimSuffix(c.baseURL, "/") + "/v1/ingest"
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+c.token)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Content-Encoding", "gzip")

	var lastErr error
	backoff := time.Second
	for attempt := 0; attempt < c.retries; attempt++ {
		if attempt > 0 {
			time.Sleep(backoff)
			backoff *= 2
			if backoff > 30*time.Second {
				backoff = 30 * time.Second
			}
		}
		req.Body = io.NopCloser(bytes.NewReader(body))
		resp, err := c.httpClient.Do(req)
		if err != nil {
			lastErr = err
			c.logger.Debug("ingest request failed", zap.Error(err), zap.Int("attempt", attempt+1))
			continue
		}
		_, _ = io.Copy(io.Discard, resp.Body)
		resp.Body.Close()
		if resp.StatusCode >= 200 && resp.StatusCode < 300 {
			return nil
		}
		if resp.StatusCode == http.StatusRequestEntityTooLarge {
			backoff = 30 * time.Second
			lastErr = ErrPayloadTooLarge
			c.logger.Warn("ingest 413 payload too large", zap.Int("attempt", attempt+1))
			continue
		}
		lastErr = fmt.Errorf("ingest returned %d", resp.StatusCode)
		c.logger.Debug("ingest non-2xx", zap.Int("status", resp.StatusCode), zap.Int("attempt", attempt+1))
	}
	return lastErr
}
