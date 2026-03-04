package envfile

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
)

// Generate writes a .env file at dir with secure defaults.
// If keys are already set in existing .env, they are preserved unless overwrite is true.
func Generate(dir string, overwrite bool, jwtSecret, agentSecret, adminPassword string) error {
	path := filepath.Join(dir, ".env")
	existing := make(map[string]string)
	if b, err := os.ReadFile(path); err == nil {
		existing = parseEnv(b)
	}

	set := func(k, v string) {
		if v != "" {
			existing[k] = v
		} else if existing[k] == "" {
			existing[k] = v
		}
	}

	if overwrite || existing["JWT_SECRET"] == "" {
		if jwtSecret == "" {
			jwtSecret = mustRandomHex(32)
		}
		set("JWT_SECRET", jwtSecret)
	}
	if overwrite || existing["AGENT_COMMAND_SECRET"] == "" {
		if agentSecret == "" {
			agentSecret = mustRandomHex(16)
		}
		set("AGENT_COMMAND_SECRET", agentSecret)
	}
	if adminPassword != "" {
		set("ADMIN_PASSWORD", adminPassword)
	}
	if existing["AUTH_ENABLED"] == "" {
		set("AUTH_ENABLED", "false")
	}
	if existing["DATABASE_URL"] == "" {
		set("DATABASE_URL", "postgresql://postgres:postgres@postgres:5432/monitoring")
	}

	order := []string{"DATABASE_URL", "JWT_SECRET", "AUTH_ENABLED", "AGENT_COMMAND_SECRET", "ADMIN_PASSWORD"}
	var content string
	for _, k := range order {
		if v := existing[k]; v != "" {
			content += fmt.Sprintf("%s=%s\n", k, v)
		}
	}
	for k, v := range existing {
		if v == "" {
			continue
		}
		seen := false
		for _, o := range order {
			if o == k {
				seen = true
				break
			}
		}
		if !seen {
			content += fmt.Sprintf("%s=%s\n", k, v)
		}
	}
	return os.WriteFile(path, []byte(content), 0600)
}

func mustRandomHex(n int) string {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	return hex.EncodeToString(b)
}

func parseEnv(b []byte) map[string]string {
	m := make(map[string]string)
	lineStart := 0
	for i := 0; i <= len(b); i++ {
		if i == len(b) || b[i] == '\n' {
			line := string(b[lineStart:i])
			for j := 0; j < len(line); j++ {
				if line[j] == '=' {
					k := line[:j]
					v := line[j+1:]
					if k != "" {
						m[k] = v
					}
					break
				}
			}
			lineStart = i + 1
		}
	}
	return m
}
