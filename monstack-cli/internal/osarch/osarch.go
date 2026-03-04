package osarch

import (
	"runtime"
)

// OS returns the detected OS (e.g. "linux", "darwin", "windows").
func OS() string {
	return runtime.GOOS
}

// Arch returns the detected architecture (e.g. "amd64", "arm64").
func Arch() string {
	return runtime.GOARCH
}

// String returns "os/arch" for display or asset selection.
func String() string {
	return OS() + "/" + Arch()
}
