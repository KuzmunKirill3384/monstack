package collectors

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

const procLoadavg = "/proc/loadavg"

func ReadLoadavg() (load1, load5, load15 float64, err error) {
	data, err := os.ReadFile(procLoadavg)
	if err != nil {
		return 0, 0, 0, fmt.Errorf("read %s: %w", procLoadavg, err)
	}
	fields := strings.Fields(string(data))
	if len(fields) < 3 {
		return 0, 0, 0, fmt.Errorf("invalid loadavg format")
	}
	load1, _ = strconv.ParseFloat(fields[0], 64)
	load5, _ = strconv.ParseFloat(fields[1], 64)
	load15, _ = strconv.ParseFloat(fields[2], 64)
	return load1, load5, load15, nil
}
