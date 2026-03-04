package procs

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
)

const (
	procBase   = "/proc"
	clkTick    = 100
	nameMaxLen = 255
)

type ProcInfo struct {
	PID       int     `json:"pid"`
	Name      string  `json:"name"`
	CPUPercent float64 `json:"cpu_pct"`
	RSSMB     float64 `json:"rss_mb"`
	IOReadBps  uint64 `json:"io_read_bps"`
	IOWriteBps uint64 `json:"io_write_bps"`
	State     string  `json:"state"`
}

func readPidStat(pid int) (name string, utime, stime uint64, rssPages uint64, state string, err error) {
	data, err := os.ReadFile(filepath.Join(procBase, strconv.Itoa(pid), "stat"))
	if err != nil {
		return "", 0, 0, 0, "", err
	}
	s := string(data)
	lparen := strings.IndexRune(s, '(')
	rparen := strings.LastIndex(s, ")")
	if lparen < 0 || rparen < lparen {
		return "", 0, 0, 0, "", fmt.Errorf("invalid stat format")
	}
	name = s[lparen+1 : rparen]
	rest := strings.Fields(s[rparen+2:])
	if len(rest) < 22 {
		return name, 0, 0, 0, "", fmt.Errorf("not enough stat fields (got %d, need 22)", len(rest))
	}
	state = rest[0]
	utime, _ = strconv.ParseUint(rest[11], 10, 64)
	stime, _ = strconv.ParseUint(rest[12], 10, 64)
	rssPages, _ = strconv.ParseUint(rest[21], 10, 64)
	return name, utime, stime, rssPages, state, nil
}

func readPidStatus(pid int) (rssKB uint64, err error) {
	f, err := os.Open(filepath.Join(procBase, strconv.Itoa(pid), "status"))
	if err != nil {
		return 0, err
	}
	defer f.Close()
	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := scanner.Text()
		if strings.HasPrefix(line, "VmRSS:") {
			fields := strings.Fields(line)
			if len(fields) >= 2 {
				rssKB, _ = strconv.ParseUint(fields[1], 10, 64)
			}
			break
		}
	}
	return rssKB, scanner.Err()
}

func readPidIO(pid int) (rchar, wchar uint64, err error) {
	f, err := os.Open(filepath.Join(procBase, strconv.Itoa(pid), "io"))
	if err != nil {
		return 0, 0, err
	}
	defer f.Close()
	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := scanner.Text()
		fields := strings.Fields(line)
		if len(fields) < 2 {
			continue
		}
		key := strings.TrimSuffix(fields[0], ":")
		val, _ := strconv.ParseUint(fields[1], 10, 64)
		switch key {
		case "rchar":
			rchar = val
		case "wchar":
			wchar = val
		}
	}
	return rchar, wchar, scanner.Err()
}

type ProcRaw struct {
	Pid   int
	Name  string
	Utime uint64
	Stime uint64
	RssKB uint64
	Rchar uint64
	Wchar uint64
	State string
}

func collectAll() ([]ProcRaw, error) {
	entries, err := os.ReadDir(procBase)
	if err != nil {
		return nil, err
	}
	var list []ProcRaw
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		pid, err := strconv.Atoi(e.Name())
		if err != nil {
			continue
		}
		name, utime, stime, rssPages, state, err := readPidStat(pid)
		if err != nil {
			continue
		}
		rssKB := rssPages * (uint64(os.Getpagesize()) / 1024)
		rssFromStatus, _ := readPidStatus(pid)
		if rssFromStatus > 0 {
			rssKB = rssFromStatus
		}
		rchar, wchar, _ := readPidIO(pid)
		list = append(list, ProcRaw{
			Pid: pid, Name: name, Utime: utime, Stime: stime,
			RssKB: rssKB, Rchar: rchar, Wchar: wchar, State: state,
		})
	}
	return list, nil
}

func TopNByCPUAndRSS(all []ProcRaw, prev map[int]ProcRaw, intervalSec float64, n int) []ProcInfo {
	type score struct {
		idx  int
		cpu  float64
		rss  float64
		comb float64
	}
	scores := make([]score, len(all))
	tickMult := 0.0
	if intervalSec > 0 {
		tickMult = 100.0 / (float64(clkTick) * intervalSec)
	}
	for i, p := range all {
		cpuPct := 0.0
		if prevP, ok := prev[p.Pid]; ok && intervalSec > 0 {
			curTicks := p.Utime + p.Stime
			prevTicks := prevP.Utime + prevP.Stime
			if curTicks > prevTicks {
				dt := curTicks - prevTicks
				cpuPct = float64(dt) * tickMult
			}
		}
		rssMB := float64(p.RssKB) / 1024
		comb := cpuPct + rssMB/100
		scores[i] = score{idx: i, cpu: cpuPct, rss: rssMB, comb: comb}
	}
	sort.Slice(scores, func(i, j int) bool { return scores[i].comb > scores[j].comb })
	top := n
	if top > len(scores) {
		top = len(scores)
	}
	result := make([]ProcInfo, 0, top)
	seen := make(map[int]struct{})
	for k := 0; k < top && k < len(scores); k++ {
		s := scores[k]
		p := all[s.idx]
		if _, ok := seen[p.Pid]; ok {
			continue
		}
		seen[p.Pid] = struct{}{}
		ioR, ioW := uint64(0), uint64(0)
		if intervalSec > 0 {
			if prevP, ok := prev[p.Pid]; ok {
				if p.Rchar >= prevP.Rchar {
					ioR = uint64(float64(p.Rchar-prevP.Rchar) / intervalSec)
				}
				if p.Wchar >= prevP.Wchar {
					ioW = uint64(float64(p.Wchar-prevP.Wchar) / intervalSec)
				}
			}
		}
		result = append(result, ProcInfo{
			PID:        p.Pid,
			Name:       truncateName(p.Name),
			CPUPercent: s.cpu,
			RSSMB:      s.rss,
			IOReadBps:  ioR,
			IOWriteBps: ioW,
			State:      p.State,
		})
	}
	return result
}

func truncateName(s string) string {
	if len(s) <= nameMaxLen {
		return s
	}
	return s[:nameMaxLen]
}

func TopN(prev map[int]ProcRaw, intervalSec float64, n int) ([]ProcInfo, map[int]ProcRaw, error) {
	all, err := collectAll()
	if err != nil {
		return nil, nil, err
	}
	next := make(map[int]ProcRaw)
	for _, p := range all {
		next[p.Pid] = p
	}
	out := TopNByCPUAndRSS(all, prev, intervalSec, n)
	return out, next, nil
}
