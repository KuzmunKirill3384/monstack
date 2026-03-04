package collectors

import (
	"math"
	"testing"
)

func TestCPUPercent_Normal(t *testing.T) {
	prev := &CPUStats{User: 100, Nice: 0, System: 50, Idle: 800, Iowait: 50}
	curr := &CPUStats{User: 200, Nice: 0, System: 100, Idle: 900, Iowait: 50}
	pct := CPUPercent(prev, curr)
	if pct < 49 || pct > 51 {
		t.Errorf("expected ~50%%, got %.2f%%", pct)
	}
}

func TestCPUPercent_FullLoad(t *testing.T) {
	prev := &CPUStats{User: 0, System: 0, Idle: 1000}
	curr := &CPUStats{User: 1000, System: 0, Idle: 1000}
	pct := CPUPercent(prev, curr)
	if pct < 99.9 || pct > 100.0 {
		t.Errorf("full load should be ~100%%, got %.2f", pct)
	}
}

func TestCPUPercent_AllIdle(t *testing.T) {
	prev := &CPUStats{Idle: 1000}
	curr := &CPUStats{Idle: 2000}
	pct := CPUPercent(prev, curr)
	if pct != 0 {
		t.Errorf("all idle should be 0, got %.2f", pct)
	}
}

func TestCPUPercent_Zero(t *testing.T) {
	s := &CPUStats{User: 100, Nice: 0, System: 50, Idle: 800}
	pct := CPUPercent(s, s)
	if pct != 0 {
		t.Errorf("expected 0, got %.2f", pct)
	}
}

func TestCPUPercent_Underflow(t *testing.T) {
	prev := &CPUStats{User: 500, Nice: 0, System: 200, Idle: 800}
	curr := &CPUStats{User: 100, Nice: 0, System: 50, Idle: 200}
	pct := CPUPercent(prev, curr)
	if pct != 0 {
		t.Errorf("underflow should return 0, got %.2f", pct)
	}
}

func TestCPUPercent_CappedAt100(t *testing.T) {
	prev := &CPUStats{User: 0, Idle: 1000}
	curr := &CPUStats{User: 2000, Idle: 1000}
	pct := CPUPercent(prev, curr)
	if pct > 100 {
		t.Errorf("should be capped at 100, got %.2f", pct)
	}
}

func TestCPUPercent_NoInf(t *testing.T) {
	prev := &CPUStats{}
	curr := &CPUStats{}
	pct := CPUPercent(prev, curr)
	if math.IsInf(pct, 0) || math.IsNaN(pct) {
		t.Errorf("zero stats should not produce Inf/NaN, got %f", pct)
	}
}

func TestCPUPercent_BusyUnderflowOnly(t *testing.T) {
	prev := &CPUStats{User: 100, System: 100, Idle: 500}
	curr := &CPUStats{User: 50, System: 50, Idle: 700}
	pct := CPUPercent(prev, curr)
	if pct != 0 {
		t.Errorf("busy underflow should return 0, got %.2f", pct)
	}
}

func TestCPUStats_Total(t *testing.T) {
	s := CPUStats{User: 10, Nice: 20, System: 30, Idle: 40, Iowait: 50, Irq: 5, Softirq: 3, Steal: 2}
	total := s.Total()
	expect := uint64(10 + 20 + 30 + 40 + 50 + 5 + 3 + 2)
	if total != expect {
		t.Errorf("Total = %d, want %d", total, expect)
	}
}

func TestCPUStats_TotalWithGuest(t *testing.T) {
	s := CPUStats{User: 10, Nice: 5, System: 3, Idle: 100, Guest: 7, GuestNice: 2}
	total := s.Total()
	expect := uint64(10 + 5 + 3 + 100 + 7 + 2)
	if total != expect {
		t.Errorf("Total = %d, want %d", total, expect)
	}
}

func TestCPUStats_IdleTotal(t *testing.T) {
	s := CPUStats{Idle: 100, Iowait: 25}
	if s.IdleTotal() != 125 {
		t.Errorf("IdleTotal = %d, want 125", s.IdleTotal())
	}
}

func TestCPUStats_Busy(t *testing.T) {
	s := CPUStats{User: 50, System: 30, Idle: 100, Iowait: 20}
	busy := s.Busy()
	expected := s.Total() - s.IdleTotal()
	if busy != expected {
		t.Errorf("Busy = %d, want %d", busy, expected)
	}
}

func TestReadCPUStat_OnLinux(t *testing.T) {
	stats, err := ReadCPUStat()
	if err != nil {
		t.Skipf("not on Linux or /proc unavailable: %v", err)
	}
	if stats.Total() == 0 {
		t.Error("Total should not be zero on a running system")
	}
	if stats.User == 0 && stats.System == 0 && stats.Idle == 0 {
		t.Error("at least one of User/System/Idle should be non-zero")
	}
}
