package collectors

import "testing"

func TestMemUsedMB(t *testing.T) {
	used, total := MemUsedMB(8000, 4000)
	if total < 7.8 || total > 7.9 {
		t.Errorf("totalMB = %.2f", total)
	}
	if used < 3.9 || used > 4.0 {
		t.Errorf("usedMB = %.2f", used)
	}
}

func TestMemUsedMB_ZeroAvailable(t *testing.T) {
	used, total := MemUsedMB(1024, 0)
	if used != total {
		t.Errorf("with 0 available, used should equal total: used=%.2f total=%.2f", used, total)
	}
}

func TestMemUsedMB_ZeroTotal(t *testing.T) {
	used, total := MemUsedMB(0, 0)
	if used != 0 || total != 0 {
		t.Errorf("zero total: used=%.2f total=%.2f", used, total)
	}
}

func TestMemUsedMB_AvailableExceedsTotal(t *testing.T) {
	used, total := MemUsedMB(1024, 2048)
	if total <= 0 {
		t.Errorf("totalMB should be positive: %.2f", total)
	}
	if used >= 0 {
		// used can be negative if available > total (this is a possible edge case on some kernels)
		// just ensure no panic
	}
}

func TestMemUsedMB_Precision(t *testing.T) {
	used, total := MemUsedMB(16384000, 8192000)
	expectedTotal := 16384000.0 / 1024
	expectedUsed := (16384000.0 - 8192000.0) / 1024
	if total != expectedTotal {
		t.Errorf("totalMB = %f, want %f", total, expectedTotal)
	}
	if used != expectedUsed {
		t.Errorf("usedMB = %f, want %f", used, expectedUsed)
	}
}

func TestReadMeminfo_OnLinux(t *testing.T) {
	total, avail, err := ReadMeminfo()
	if err != nil {
		t.Skipf("not on Linux or /proc unavailable: %v", err)
	}
	if total == 0 {
		t.Error("total should not be 0 on running system")
	}
	if avail > total {
		t.Logf("avail (%d) > total (%d) — unusual but not error", avail, total)
	}
}
