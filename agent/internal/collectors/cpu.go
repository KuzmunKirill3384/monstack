package collectors

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

const procStat = "/proc/stat"

type CPUStats struct {
	User   uint64
	Nice   uint64
	System uint64
	Idle   uint64
	Iowait uint64
	Irq    uint64
	Softirq uint64
	Steal  uint64
	Guest  uint64
	GuestNice uint64
}

func (c *CPUStats) Total() uint64 {
	return c.User + c.Nice + c.System + c.Idle + c.Iowait + c.Irq + c.Softirq + c.Steal + c.Guest + c.GuestNice
}

func (c *CPUStats) IdleTotal() uint64 {
	return c.Idle + c.Iowait
}

func (c *CPUStats) Busy() uint64 {
	return c.Total() - c.IdleTotal()
}

func ReadCPUStat() (*CPUStats, error) {
	data, err := os.ReadFile(procStat)
	if err != nil {
		return nil, fmt.Errorf("read %s: %w", procStat, err)
	}
	lines := strings.Split(string(data), "\n")
	for _, line := range lines {
		if !strings.HasPrefix(line, "cpu ") {
			continue
		}
		fields := strings.Fields(line)
		if len(fields) < 8 {
			continue
		}
		var s CPUStats
		s.User, _ = strconv.ParseUint(fields[1], 10, 64)
		s.Nice, _ = strconv.ParseUint(fields[2], 10, 64)
		s.System, _ = strconv.ParseUint(fields[3], 10, 64)
		s.Idle, _ = strconv.ParseUint(fields[4], 10, 64)
		s.Iowait, _ = strconv.ParseUint(fields[5], 10, 64)
		s.Irq, _ = strconv.ParseUint(fields[6], 10, 64)
		s.Softirq, _ = strconv.ParseUint(fields[7], 10, 64)
		if len(fields) > 8 {
			s.Steal, _ = strconv.ParseUint(fields[8], 10, 64)
		}
		if len(fields) > 9 {
			s.Guest, _ = strconv.ParseUint(fields[9], 10, 64)
		}
		if len(fields) > 10 {
			s.GuestNice, _ = strconv.ParseUint(fields[10], 10, 64)
		}
		return &s, nil
	}
	return nil, fmt.Errorf("cpu line not found in %s", procStat)
}

func CPUPercent(prev, curr *CPUStats) float64 {
	totalDelta := curr.Total() - prev.Total()
	if totalDelta == 0 {
		return 0
	}
	busyDelta := curr.Busy() - prev.Busy()
	return 100.0 * float64(busyDelta) / float64(totalDelta)
}
