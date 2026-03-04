package docker

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
)

// ComposeCmd returns the docker compose command (plugin or standalone).
func ComposeCmd() (usePlugin bool, err error) {
	if _, err := exec.LookPath("docker"); err != nil {
		return false, fmt.Errorf("docker not found: install from https://docs.docker.com/engine/install")
	}
	if out, err := exec.Command("docker", "compose", "version").CombinedOutput(); err == nil && len(out) > 0 {
		return true, nil
	}
	if _, err := exec.LookPath("docker-compose"); err == nil {
		return false, nil
	}
	return false, fmt.Errorf("docker compose not found: install Docker Compose plugin or docker-compose")
}

// RunCompose runs docker compose in dir with args. Env is loaded from dir/.env.
func RunCompose(dir string, args ...string) error {
	usePlugin, err := ComposeCmd()
	if err != nil {
		return err
	}
	var cmd *exec.Cmd
	if usePlugin {
		cmd = exec.Command("docker", append([]string{"compose"}, args...)...)
	} else {
		cmd = exec.Command("docker-compose", args...)
	}
	cmd.Dir = dir
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Env = os.Environ()
	if envPath := filepath.Join(dir, ".env"); dir != "" {
		if b, err := os.ReadFile(envPath); err == nil {
			for _, line := range splitLines(b) {
				if len(line) == 0 {
					continue
				}
				for i := 0; i < len(line); i++ {
					if line[i] == '=' {
						k, v := line[:i], line[i+1:]
						cmd.Env = append(cmd.Env, k+"="+v)
						break
					}
				}
			}
		}
	}
	return cmd.Run()
}

func splitLines(b []byte) []string {
	var lines []string
	start := 0
	for i := 0; i <= len(b); i++ {
		if i == len(b) || b[i] == '\n' {
			lines = append(lines, string(b[start:i]))
			start = i + 1
		}
	}
	return lines
}

// ComposeUp runs docker compose up -d (optionally --build). All services including agent are started.
func ComposeUp(dir string, build bool, _ bool) error {
	args := []string{"up", "-d"}
	if build {
		args = append(args, "--build")
	}
	return RunCompose(dir, args...)
}

// ComposeDown runs docker compose down.
func ComposeDown(dir string) error {
	return RunCompose(dir, "down")
}

// ComposePs runs docker compose ps and returns combined output.
func ComposePs(dir string) ([]byte, error) {
	usePlugin, err := ComposeCmd()
	if err != nil {
		return nil, err
	}
	var cmd *exec.Cmd
	if usePlugin {
		cmd = exec.Command("docker", "compose", "ps")
	} else {
		cmd = exec.Command("docker-compose", "ps")
	}
	cmd.Dir = dir
	cmd.Env = os.Environ()
	return cmd.CombinedOutput()
}

// ComposePull runs docker compose pull.
func ComposePull(dir string) error {
	return RunCompose(dir, "pull")
}
