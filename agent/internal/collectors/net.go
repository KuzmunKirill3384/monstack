package collectors

import (
	"bufio"
	"fmt"
	"os"
	"strconv"
	"strings"
)

const procNetDev = "/proc/net/dev"

type NetStats struct {
	RxBytes   uint64
	RxPackets uint64
	TxBytes   uint64
	TxPackets uint64
}

func ReadNetDev() (*NetStats, error) {
	f, err := os.Open(procNetDev)
	if err != nil {
		return nil, fmt.Errorf("open %s: %w", procNetDev, err)
	}
	defer f.Close()
	scanner := bufio.NewScanner(f)
	var total NetStats
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if strings.HasPrefix(line, "Inter-") || strings.HasPrefix(line, "face") {
			continue
		}
		idx := strings.Index(line, ":")
		if idx < 0 {
			continue
		}
		iface := strings.TrimSpace(line[:idx])
		if iface == "lo" {
			continue
		}
		fields := strings.Fields(line[idx+1:])
		if len(fields) < 16 {
			continue
		}
		rxBytes, _ := strconv.ParseUint(fields[0], 10, 64)
		rxPackets, _ := strconv.ParseUint(fields[1], 10, 64)
		txBytes, _ := strconv.ParseUint(fields[8], 10, 64)
		txPackets, _ := strconv.ParseUint(fields[9], 10, 64)
		total.RxBytes += rxBytes
		total.RxPackets += rxPackets
		total.TxBytes += txBytes
		total.TxPackets += txPackets
	}
	if err := scanner.Err(); err != nil {
		return nil, err
	}
	return &total, nil
}

func NetBps(prev, curr *NetStats, intervalSec float64) (rxBps, txBps uint64) {
	if intervalSec <= 0 {
		return 0, 0
	}
	rxBps = uint64(float64(curr.RxBytes-prev.RxBytes) / intervalSec)
	txBps = uint64(float64(curr.TxBytes-prev.TxBytes) / intervalSec)
	return rxBps, txBps
}
