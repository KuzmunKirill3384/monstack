package main

import (
	"flag"
	"fmt"
	"os"
	"path/filepath"

	"monstack-cli/internal/docker"
	"monstack-cli/internal/envfile"
	"monstack-cli/internal/osarch"
)

func main() {
	installCmd := flag.NewFlagSet("install", flag.ExitOnError)
	installDir := installCmd.String("dir", ".", "installation directory (contains docker-compose.yml)")
	installJWT := installCmd.String("jwt-secret", "", "JWT secret (default: random)")
	installAgentSecret := installCmd.String("agent-secret", "", "agent command secret (default: random)")
	installPassword := installCmd.String("admin-password", "", "admin password for web login (default: random, written to .env)")
	installWithAgent := installCmd.Bool("with-agent", false, "start with agent profile")
	installOverwrite := installCmd.Bool("overwrite-env", false, "overwrite existing .env secrets")

	startCmd := flag.NewFlagSet("start", flag.ExitOnError)
	startDir := startCmd.String("dir", ".", "installation directory")
	startBuild := startCmd.Bool("build", false, "build images before starting")
	startWithAgent := startCmd.Bool("with-agent", false, "include agent profile")

	stopCmd := flag.NewFlagSet("stop", flag.ExitOnError)
	stopDir := stopCmd.String("dir", ".", "installation directory")

	statusCmd := flag.NewFlagSet("status", flag.ExitOnError)
	statusDir := statusCmd.String("dir", ".", "installation directory")

	upgradeCmd := flag.NewFlagSet("upgrade", flag.ExitOnError)
	upgradeDir := upgradeCmd.String("dir", ".", "installation directory")
	upgradeWithAgent := upgradeCmd.Bool("with-agent", false, "include agent profile")

	uninstallCmd := flag.NewFlagSet("uninstall", flag.ExitOnError)
	uninstallDir := uninstallCmd.String("dir", ".", "installation directory")
	uninstallVolumes := uninstallCmd.Bool("volumes", false, "remove Docker volumes (deletes all data)")

	if len(os.Args) < 2 {
		printUsage()
		os.Exit(1)
	}

	switch os.Args[1] {
	case "install":
		_ = installCmd.Parse(os.Args[2:])
		d, _ := filepath.Abs(*installDir)
		if err := runInstall(d, *installJWT, *installAgentSecret, *installPassword, *installWithAgent, *installOverwrite); err != nil {
			fmt.Fprintf(os.Stderr, "install: %v\n", err)
			os.Exit(1)
		}
	case "start":
		_ = startCmd.Parse(os.Args[2:])
		d, _ := filepath.Abs(*startDir)
		if err := runStart(d, *startBuild, *startWithAgent); err != nil {
			fmt.Fprintf(os.Stderr, "start: %v\n", err)
			os.Exit(1)
		}
	case "stop":
		_ = stopCmd.Parse(os.Args[2:])
		d, _ := filepath.Abs(*stopDir)
		if err := runStop(d); err != nil {
			fmt.Fprintf(os.Stderr, "stop: %v\n", err)
			os.Exit(1)
		}
	case "status":
		_ = statusCmd.Parse(os.Args[2:])
		d, _ := filepath.Abs(*statusDir)
		if err := runStatus(d); err != nil {
			fmt.Fprintf(os.Stderr, "status: %v\n", err)
			os.Exit(1)
		}
	case "upgrade":
		_ = upgradeCmd.Parse(os.Args[2:])
		d, _ := filepath.Abs(*upgradeDir)
		if err := runUpgrade(d, *upgradeWithAgent); err != nil {
			fmt.Fprintf(os.Stderr, "upgrade: %v\n", err)
			os.Exit(1)
		}
	case "uninstall":
		_ = uninstallCmd.Parse(os.Args[2:])
		d, _ := filepath.Abs(*uninstallDir)
		if err := runUninstall(d, *uninstallVolumes); err != nil {
			fmt.Fprintf(os.Stderr, "uninstall: %v\n", err)
			os.Exit(1)
		}
	case "version", "-v", "--version":
		fmt.Println("monstack-cli 0.1.0", osarch.String())
		return
	default:
		printUsage()
		os.Exit(1)
	}
}

func printUsage() {
	fmt.Fprintf(os.Stderr, `monstack-cli — manage Monstack installation (OS: %s)

Usage:
  monstack-cli install   [--dir=<path>] [--jwt-secret=] [--agent-secret=] [--admin-password=] [--with-agent] [--overwrite-env]
  monstack-cli start     [--dir=<path>] [--build] [--with-agent]
  monstack-cli stop     [--dir=<path>]
  monstack-cli status   [--dir=<path>]
  monstack-cli upgrade  [--dir=<path>] [--with-agent]
  monstack-cli uninstall [--dir=<path>] [--volumes]
  monstack-cli version

Install: ensures Docker (and optionally Node.js) are available, generates .env with
secure defaults, then you can run 'start'. Use --dir to point to the repo root (with
docker-compose.yml). If Docker is missing, run: https://docs.docker.com/engine/install
`, osarch.String())
}

func runInstall(dir, jwtSecret, agentSecret, adminPassword string, withAgent, overwrite bool) error {
	if _, err := docker.ComposeCmd(); err != nil {
		fmt.Fprintf(os.Stderr, "Docker check: %v\n", err)
		fmt.Fprintf(os.Stderr, "Install Docker: https://docs.docker.com/engine/install\n")
		return err
	}
	composePath := filepath.Join(dir, "docker-compose.yml")
	if _, err := os.Stat(composePath); err != nil {
		return fmt.Errorf("docker-compose.yml not found in %s: run from repo root or use --dir", dir)
	}
	if err := envfile.Generate(dir, overwrite, jwtSecret, agentSecret, adminPassword); err != nil {
		return err
	}
	fmt.Println("Generated .env with secure defaults.")
	fmt.Println("Start the stack: monstack-cli start --dir", dir)
	if withAgent {
		return docker.ComposeUp(dir, true, true)
	}
	return nil
}

func runStart(dir string, build, withAgent bool) error {
	if _, err := docker.ComposeCmd(); err != nil {
		return err
	}
	return docker.ComposeUp(dir, build, withAgent)
}

func runStop(dir string) error {
	if _, err := docker.ComposeCmd(); err != nil {
		return err
	}
	return docker.ComposeDown(dir)
}

func runStatus(dir string) error {
	if _, err := docker.ComposeCmd(); err != nil {
		return err
	}
	out, err := docker.ComposePs(dir)
	if err != nil {
		return err
	}
	fmt.Print(string(out))
	return nil
}

func runUpgrade(dir string, withAgent bool) error {
	if _, err := docker.ComposeCmd(); err != nil {
		return err
	}
	if err := docker.ComposePull(dir); err != nil {
		return err
	}
	return docker.ComposeUp(dir, true, withAgent)
}

func runUninstall(dir string, volumes bool) error {
	if _, err := docker.ComposeCmd(); err != nil {
		return err
	}
	args := []string{"down"}
	if volumes {
		args = append(args, "-v")
	}
	return docker.RunCompose(dir, args...)
}
