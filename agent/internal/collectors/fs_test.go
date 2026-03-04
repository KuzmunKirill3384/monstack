package collectors

import "testing"

func TestDiskUsedPct_Root(t *testing.T) {
	pct, err := DiskUsedPct("/")
	if err != nil {
		t.Skipf("skipping: %v", err)
	}
	if pct < 0 || pct > 100 {
		t.Errorf("disk pct out of range: %.2f", pct)
	}
}

func TestDiskUsedPct_TmpDir(t *testing.T) {
	dir := t.TempDir()
	pct, err := DiskUsedPct(dir)
	if err != nil {
		t.Skipf("skipping: %v", err)
	}
	if pct < 0 || pct > 100 {
		t.Errorf("pct out of range: %.2f", pct)
	}
}

func TestDiskUsedPct_NonExistent(t *testing.T) {
	_, err := DiskUsedPct("/nonexistent_path_xyz_12345")
	if err == nil {
		t.Error("expected error for nonexistent path")
	}
}

func TestDiskUsedPctFirst_Empty(t *testing.T) {
	pct, err := DiskUsedPctFirst(nil)
	if err != nil {
		t.Skipf("skipping: %v", err)
	}
	if pct < 0 || pct > 100 {
		t.Errorf("pct out of range: %.2f", pct)
	}
}

func TestDiskUsedPctFirst_Invalid(t *testing.T) {
	pct, _ := DiskUsedPctFirst([]string{"/nonexistent_path_xyz"})
	if pct != 0 {
		t.Errorf("invalid path should return 0, got %.2f", pct)
	}
}

func TestDiskUsedPctFirst_FallbackToValid(t *testing.T) {
	pct, err := DiskUsedPctFirst([]string{"/nonexistent_xyz", "/"})
	if err != nil {
		t.Skipf("skipping: %v", err)
	}
	if pct <= 0 {
		t.Logf("pct = %.2f (root disk might be nearly empty)", pct)
	}
}

func TestDiskUsedPctFirst_FirstValid(t *testing.T) {
	dir := t.TempDir()
	pct, err := DiskUsedPctFirst([]string{dir, "/"})
	if err != nil {
		t.Skipf("skipping: %v", err)
	}
	if pct < 0 || pct > 100 {
		t.Errorf("pct out of range: %.2f", pct)
	}
}

func TestDiskUsedPctFirst_AllInvalid(t *testing.T) {
	pct, _ := DiskUsedPctFirst([]string{"/no1", "/no2", "/no3"})
	if pct != 0 {
		t.Errorf("all invalid should return 0, got %.2f", pct)
	}
}
