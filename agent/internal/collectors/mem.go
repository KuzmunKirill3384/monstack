package collectors

import (
	"bufio"
	"fmt"
	"os"
	"strconv"
	"strings"
)

const procMeminfo = "/proc/meminfo"

func ReadMeminfo() (memTotalKB, memAvailableKB uint64, err error) {
	f, err := os.Open(procMeminfo)
	if err != nil {
		return 0, 0, fmt.Errorf("open %s: %w", procMeminfo, err)
	}
	defer f.Close()
	scanner := bufio.NewScanner(f)
	var total, available uint64
	for scanner.Scan() {
		line := scanner.Text()
		fields := strings.Fields(line)
		if len(fields) < 3 {
			continue
		}
		key := strings.TrimSuffix(fields[0], ":")
		val, e := strconv.ParseUint(fields[1], 10, 64)
		if e != nil {
			continue
		}
		switch key {
		case "MemTotal":
			total = val
		case "MemAvailable":
			available = val
		}
		if total > 0 && available > 0 {
			break
		}
	}
	if err := scanner.Err(); err != nil {
		return 0, 0, err
	}
	if total == 0 {
		return 0, 0, fmt.Errorf("MemTotal not found in %s", procMeminfo)
	}
	if available == 0 {
		var free, buffers, cached uint64
		f.Seek(0, 0)
		scanner = bufio.NewScanner(f)
		for scanner.Scan() {
			line := scanner.Text()
			fields := strings.Fields(line)
			if len(fields) < 3 {
				continue
			}
			key := strings.TrimSuffix(fields[0], ":")
			val, _ := strconv.ParseUint(fields[1], 10, 64)
			switch key {
			case "MemFree":
				free = val
			case "Buffers":
				buffers = val
			case "Cached":
				cached = val
			}
		}
		available = free + buffers + cached
	}
	return total, available, nil
}

func MemUsedMB(totalKB, availableKB uint64) (usedMB, totalMB float64) {
	totalMB = float64(totalKB) / 1024
	usedMB = (float64(totalKB) - float64(availableKB)) / 1024
	return usedMB, totalMB
}
