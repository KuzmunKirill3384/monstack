package collectors

import "testing"

func TestReadLoadavg_OnLinux(t *testing.T) {
	l1, l5, l15, err := ReadLoadavg()
	if err != nil {
		t.Skipf("not on Linux or /proc unavailable: %v", err)
	}
	if l1 < 0 || l5 < 0 || l15 < 0 {
		t.Errorf("negative load: %.2f %.2f %.2f", l1, l5, l15)
	}
}
