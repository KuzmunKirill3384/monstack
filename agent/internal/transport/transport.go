package transport

import (
	"bytes"
	"crypto/tls"
	"crypto/x509"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
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

func New(baseURL, token string, timeoutSec, retries int, insecureSkipVerify bool, caCertPath string, logger *zap.Logger) *Client {
	if timeoutSec <= 0 {
		timeoutSec = 30
	}
	if retries <= 0 {
		retries = 3
	}
	tlsConfig := &tls.Config{InsecureSkipVerify: insecureSkipVerify}
	if caCertPath != "" {
		data, err := os.ReadFile(caCertPath)
		if err != nil {
			logger.Warn("failed to read CA cert, using system pool", zap.String("path", caCertPath), zap.Error(err))
		} else {
			pool := x509.NewCertPool()
			if pool.AppendCertsFromPEM(data) {
				tlsConfig.RootCAs = pool
			}
		}
	}
	tr := &http.Transport{
		TLSClientConfig:     tlsConfig,
		MaxIdleConnsPerHost: 2,
		MaxConnsPerHost:     2,
	}
	return &Client{
		baseURL: baseURL,
		token:   token,
		timeout: time.Duration(timeoutSec) * time.Second,
		retries: retries,
		httpClient: &http.Client{
			Timeout:   time.Duration(timeoutSec) * time.Second,
			Transport: tr,
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
			c.logger.Warn("ingest 413 payload too large", zap.Int("attempt", attempt+1))
			return ErrPayloadTooLarge
		}
		if resp.StatusCode >= 400 && resp.StatusCode < 500 {
			c.logger.Warn("ingest client error, not retrying", zap.Int("status", resp.StatusCode))
			return fmt.Errorf("ingest returned %d", resp.StatusCode)
		}
		lastErr = fmt.Errorf("ingest returned %d", resp.StatusCode)
		c.logger.Debug("ingest non-2xx, will retry", zap.Int("status", resp.StatusCode), zap.Int("attempt", attempt+1))
	}
	return lastErr
}
