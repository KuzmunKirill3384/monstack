package procs

import (
	"math"
	"testing"
)

func TestTopNByCPUAndRSS_Normal(t *testing.T) {
	prev := map[int]ProcRaw{
		1: {Pid: 1, Utime: 100, Stime: 50, Rchar: 1000, Wchar: 500},
		2: {Pid: 2, Utime: 200, Stime: 100, Rchar: 2000, Wchar: 1000},
	}
	all := []ProcRaw{
		{Pid: 1, Name: "a", Utime: 200, Stime: 100, RssKB: 10240, Rchar: 2000, Wchar: 1000, State: "S"},
		{Pid: 2, Name: "b", Utime: 400, Stime: 200, RssKB: 20480, Rchar: 4000, Wchar: 2000, State: "R"},
	}
	result := TopNByCPUAndRSS(all, prev, 10, 5)
	if len(result) != 2 {
		t.Fatalf("expected 2 results, got %d", len(result))
	}
	for _, p := range result {
		if p.CPUPercent < 0 {
			t.Errorf("pid %d has negative CPU: %.2f", p.PID, p.CPUPercent)
		}
		if math.IsInf(p.CPUPercent, 0) || math.IsNaN(p.CPUPercent) {
			t.Errorf("pid %d has invalid CPU: %.2f", p.PID, p.CPUPercent)
		}
	}
}

func TestTopNByCPUAndRSS_CPUCalculation(t *testing.T) {
	prev := map[int]ProcRaw{
		1: {Pid: 1, Utime: 1000, Stime: 500},
	}
	all := []ProcRaw{
		{Pid: 1, Name: "test", Utime: 1100, Stime: 550, RssKB: 1024, State: "R"},
	}
	result := TopNByCPUAndRSS(all, prev, 10, 5)
	if len(result) != 1 {
		t.Fatalf("expected 1, got %d", len(result))
	}
	// delta ticks = (1100-1000) + (550-500) = 150
	// tickMult = 100 / (100 * 10) = 0.1
	// cpuPct = 150 * 0.1 = 15.0
	expected := 15.0
	if math.Abs(result[0].CPUPercent-expected) > 0.01 {
		t.Errorf("expected CPU %.2f, got %.2f", expected, result[0].CPUPercent)
	}
}

func TestTopNByCPUAndRSS_IOCalculation(t *testing.T) {
	prev := map[int]ProcRaw{
		1: {Pid: 1, Utime: 100, Stime: 50, Rchar: 10000, Wchar: 5000},
	}
	all := []ProcRaw{
		{Pid: 1, Name: "io", Utime: 200, Stime: 100, RssKB: 1024, Rchar: 20000, Wchar: 10000, State: "S"},
	}
	result := TopNByCPUAndRSS(all, prev, 10, 5)
	if len(result) != 1 {
		t.Fatalf("expected 1, got %d", len(result))
	}
	// ioR = (20000 - 10000) / 10 = 1000
	// ioW = (10000 - 5000) / 10 = 500
	if result[0].IOReadBps != 1000 {
		t.Errorf("IOReadBps = %d, want 1000", result[0].IOReadBps)
	}
	if result[0].IOWriteBps != 500 {
		t.Errorf("IOWriteBps = %d, want 500", result[0].IOWriteBps)
	}
}

func TestTopNByCPUAndRSS_PIDReuse(t *testing.T) {
	prev := map[int]ProcRaw{
		42: {Pid: 42, Utime: 99999, Stime: 99999, Rchar: 99999, Wchar: 99999},
	}
	all := []ProcRaw{
		{Pid: 42, Name: "new", Utime: 10, Stime: 5, RssKB: 1024, Rchar: 100, Wchar: 50, State: "S"},
	}
	result := TopNByCPUAndRSS(all, prev, 10, 5)
	if len(result) != 1 {
		t.Fatalf("expected 1, got %d", len(result))
	}
	if result[0].CPUPercent != 0 {
		t.Errorf("PID reuse should yield 0 CPU, got %.2f", result[0].CPUPercent)
	}
	if result[0].IOReadBps != 0 {
		t.Errorf("PID reuse should yield 0 IORead, got %d", result[0].IOReadBps)
	}
	if result[0].IOWriteBps != 0 {
		t.Errorf("PID reuse should yield 0 IOWrite, got %d", result[0].IOWriteBps)
	}
}

func TestTopNByCPUAndRSS_NoPrev(t *testing.T) {
	all := []ProcRaw{
		{Pid: 1, Name: "init", Utime: 500, Stime: 100, RssKB: 2048, State: "S"},
	}
	result := TopNByCPUAndRSS(all, nil, 10, 5)
	if len(result) != 1 {
		t.Fatalf("expected 1, got %d", len(result))
	}
	if result[0].CPUPercent != 0 {
		t.Errorf("no prev should yield 0 CPU, got %.2f", result[0].CPUPercent)
	}
	if result[0].RSSMB != 2.0 {
		t.Errorf("RSS = %.2f, want 2.0", result[0].RSSMB)
	}
}

func TestTopNByCPUAndRSS_Empty(t *testing.T) {
	result := TopNByCPUAndRSS(nil, nil, 10, 5)
	if len(result) != 0 {
		t.Errorf("empty input should produce empty output, got %d", len(result))
	}
}

func TestTopNByCPUAndRSS_TopN(t *testing.T) {
	var all []ProcRaw
	for i := 0; i < 20; i++ {
		all = append(all, ProcRaw{Pid: i + 1, Name: "p", RssKB: uint64((i + 1) * 1024), State: "S"})
	}
	result := TopNByCPUAndRSS(all, nil, 10, 5)
	if len(result) != 5 {
		t.Errorf("expected 5 results, got %d", len(result))
	}
}

func TestTopNByCPUAndRSS_TopNLargerThanInput(t *testing.T) {
	all := []ProcRaw{
		{Pid: 1, Name: "a", RssKB: 1024, State: "S"},
		{Pid: 2, Name: "b", RssKB: 2048, State: "S"},
	}
	result := TopNByCPUAndRSS(all, nil, 10, 100)
	if len(result) != 2 {
		t.Errorf("expected 2, got %d", len(result))
	}
}

func TestTopNByCPUAndRSS_ZeroInterval(t *testing.T) {
	prev := map[int]ProcRaw{
		1: {Pid: 1, Utime: 100, Stime: 50, Rchar: 1000, Wchar: 500},
	}
	all := []ProcRaw{
		{Pid: 1, Name: "a", Utime: 200, Stime: 100, RssKB: 1024, Rchar: 2000, Wchar: 1000, State: "S"},
	}
	result := TopNByCPUAndRSS(all, prev, 0, 5)
	if len(result) != 1 {
		t.Fatalf("expected 1, got %d", len(result))
	}
	if result[0].CPUPercent != 0 {
		t.Errorf("zero interval should yield 0 CPU, got %.2f", result[0].CPUPercent)
	}
	if result[0].IOReadBps != 0 {
		t.Errorf("zero interval should yield 0 IORead, got %d", result[0].IOReadBps)
	}
	if result[0].IOWriteBps != 0 {
		t.Errorf("zero interval should yield 0 IOWrite, got %d", result[0].IOWriteBps)
	}
}

func TestTopNByCPUAndRSS_NegativeInterval(t *testing.T) {
	prev := map[int]ProcRaw{
		1: {Pid: 1, Utime: 100, Stime: 50},
	}
	all := []ProcRaw{
		{Pid: 1, Name: "a", Utime: 200, Stime: 100, RssKB: 1024, State: "S"},
	}
	result := TopNByCPUAndRSS(all, prev, -5, 5)
	if len(result) != 1 {
		t.Fatalf("expected 1, got %d", len(result))
	}
	if result[0].CPUPercent != 0 {
		t.Errorf("negative interval should yield 0 CPU, got %.2f", result[0].CPUPercent)
	}
}

func TestTopNByCPUAndRSS_NoInf(t *testing.T) {
	prev := map[int]ProcRaw{
		1: {Pid: 1, Utime: 0, Stime: 0},
	}
	all := []ProcRaw{
		{Pid: 1, Name: "a", Utime: 100, Stime: 50, RssKB: 1024, State: "S"},
	}
	for _, interval := range []float64{0, -1, 0.0001} {
		result := TopNByCPUAndRSS(all, prev, interval, 5)
		for _, p := range result {
			if math.IsInf(p.CPUPercent, 0) || math.IsNaN(p.CPUPercent) {
				t.Errorf("interval=%.4f produced invalid CPU: %f", interval, p.CPUPercent)
			}
		}
	}
}

func TestTopNByCPUAndRSS_SortByCombinedScore(t *testing.T) {
	all := []ProcRaw{
		{Pid: 1, Name: "low", Utime: 0, Stime: 0, RssKB: 1024, State: "S"},
		{Pid: 2, Name: "high-rss", Utime: 0, Stime: 0, RssKB: 102400, State: "S"},
		{Pid: 3, Name: "high-cpu", Utime: 0, Stime: 0, RssKB: 1024, State: "R"},
	}
	prev := map[int]ProcRaw{
		3: {Pid: 3, Utime: 0, Stime: 0},
	}
	allWithCPU := make([]ProcRaw, len(all))
	copy(allWithCPU, all)
	allWithCPU[2].Utime = 1000
	allWithCPU[2].Stime = 500

	result := TopNByCPUAndRSS(allWithCPU, prev, 10, 3)
	if len(result) < 2 {
		t.Fatalf("expected at least 2, got %d", len(result))
	}
}

func TestTopNByCPUAndRSS_DuplicatePIDs(t *testing.T) {
	all := []ProcRaw{
		{Pid: 1, Name: "dup1", RssKB: 1024, State: "S"},
		{Pid: 1, Name: "dup2", RssKB: 2048, State: "S"},
	}
	result := TopNByCPUAndRSS(all, nil, 10, 5)
	pids := map[int]bool{}
	for _, p := range result {
		if pids[p.PID] {
			t.Errorf("duplicate PID %d in output", p.PID)
		}
		pids[p.PID] = true
	}
}

func TestTruncateName(t *testing.T) {
	short := "bash"
	if truncateName(short) != short {
		t.Errorf("short name mangled")
	}
	long := ""
	for i := 0; i < 300; i++ {
		long += "x"
	}
	if len(truncateName(long)) != nameMaxLen {
		t.Errorf("long name not truncated: len=%d", len(truncateName(long)))
	}
}

func TestTruncateName_ExactBoundary(t *testing.T) {
	exact := ""
	for i := 0; i < nameMaxLen; i++ {
		exact += "a"
	}
	if truncateName(exact) != exact {
		t.Error("exact-length name should not be modified")
	}
}

func TestTruncateName_Empty(t *testing.T) {
	if truncateName("") != "" {
		t.Error("empty name should stay empty")
	}
}

func TestReadPidStat_CommInParens(t *testing.T) {
	tests := []struct {
		stat       string
		wantName   string
		wantUtime  uint64
		wantStime  uint64
		wantRss    uint64
		wantState  string
		wantErr    bool
	}{
		{
			"1234 (bash) S 1 1234 1234 0 -1 4194560 100 0 0 0 50 25 0 0 20 0 1 0 1000 500000 1024 0 0 0 0",
			"bash", 50, 25, 1024, "S", false,
		},
		{
			"5678 (my proc name) R 1 5678 5678 0 -1 4194304 200 0 0 0 1000 500 0 0 20 0 1 0 2000 600000 2048 0 0 0 0",
			"my proc name", 1000, 500, 2048, "R", false,
		},
		{
			"9999 (cmd (nested)) S 1 9999 9999 0 -1 0 0 0 0 0 100 50 0 0 20 0 1 0 3000 700000 512 0 0 0 0",
			"cmd (nested)", 100, 50, 512, "S", false,
		},
		{
			"bad",
			"", 0, 0, 0, "", true,
		},
		{
			"1 (x) S",
			"x", 0, 0, 0, "", true,
		},
	}
	for _, tt := range tests {
		name, utime, stime, rss, state, err := parseStatString(tt.stat)
		if tt.wantErr {
			if err == nil {
				t.Errorf("parseStatString(%q) wanted error", tt.stat)
			}
			continue
		}
		if err != nil {
			t.Errorf("parseStatString(%q) err=%v", tt.stat, err)
			continue
		}
		if name != tt.wantName || utime != tt.wantUtime || stime != tt.wantStime || rss != tt.wantRss || state != tt.wantState {
			t.Errorf("parseStatString(%q) got name=%q utime=%d stime=%d rss=%d state=%q",
				tt.stat, name, utime, stime, rss, state)
		}
	}
}

func BenchmarkTopNByCPUAndRSS(b *testing.B) {
	var all []ProcRaw
	prev := make(map[int]ProcRaw)
	for i := 0; i < 500; i++ {
		pid := i + 1
		raw := ProcRaw{
			Pid: pid, Name: "proc", Utime: uint64(i * 100), Stime: uint64(i * 50),
			RssKB: uint64(i * 1024), Rchar: uint64(i * 10000), Wchar: uint64(i * 5000), State: "S",
		}
		all = append(all, raw)
		prev[pid] = ProcRaw{
			Pid: pid, Utime: uint64(i * 90), Stime: uint64(i * 45),
			Rchar: uint64(i * 9000), Wchar: uint64(i * 4500),
		}
	}
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		TopNByCPUAndRSS(all, prev, 10, 15)
	}
}
