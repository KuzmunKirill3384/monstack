package collectors

import "testing"

func TestNetBps_Normal(t *testing.T) {
	prev := &NetStats{RxBytes: 1000, TxBytes: 500}
	curr := &NetStats{RxBytes: 2000, TxBytes: 1500}
	rx, tx := NetBps(prev, curr, 10)
	if rx != 100 {
		t.Errorf("rx = %d, want 100", rx)
	}
	if tx != 100 {
		t.Errorf("tx = %d, want 100", tx)
	}
}

func TestNetBps_ZeroInterval(t *testing.T) {
	prev := &NetStats{RxBytes: 1000}
	curr := &NetStats{RxBytes: 2000}
	rx, tx := NetBps(prev, curr, 0)
	if rx != 0 || tx != 0 {
		t.Errorf("zero interval should return 0, got rx=%d tx=%d", rx, tx)
	}
}

func TestNetBps_Underflow(t *testing.T) {
	prev := &NetStats{RxBytes: 5000, TxBytes: 3000}
	curr := &NetStats{RxBytes: 1000, TxBytes: 500}
	rx, tx := NetBps(prev, curr, 10)
	if rx != 0 {
		t.Errorf("rx underflow should be 0, got %d", rx)
	}
	if tx != 0 {
		t.Errorf("tx underflow should be 0, got %d", tx)
	}
}

func TestNetBps_NegativeInterval(t *testing.T) {
	prev := &NetStats{RxBytes: 1000}
	curr := &NetStats{RxBytes: 2000}
	rx, tx := NetBps(prev, curr, -5)
	if rx != 0 || tx != 0 {
		t.Errorf("negative interval should return 0, got rx=%d tx=%d", rx, tx)
	}
}

func TestNetBps_EqualCounters(t *testing.T) {
	s := &NetStats{RxBytes: 5000, TxBytes: 3000}
	rx, tx := NetBps(s, s, 10)
	if rx != 0 || tx != 0 {
		t.Errorf("equal counters should return 0, got rx=%d tx=%d", rx, tx)
	}
}

func TestNetBps_LargeValues(t *testing.T) {
	prev := &NetStats{RxBytes: 1e15, TxBytes: 1e15}
	curr := &NetStats{RxBytes: 1e15 + 1e10, TxBytes: 1e15 + 5e9}
	rx, tx := NetBps(prev, curr, 1)
	if rx != uint64(1e10) {
		t.Errorf("rx = %d, want %d", rx, uint64(1e10))
	}
	if tx != uint64(5e9) {
		t.Errorf("tx = %d, want %d", tx, uint64(5e9))
	}
}

func TestNetBps_OnlyRxChanged(t *testing.T) {
	prev := &NetStats{RxBytes: 1000, TxBytes: 500}
	curr := &NetStats{RxBytes: 2000, TxBytes: 500}
	rx, tx := NetBps(prev, curr, 10)
	if rx != 100 {
		t.Errorf("rx = %d, want 100", rx)
	}
	if tx != 0 {
		t.Errorf("tx should be 0 when unchanged, got %d", tx)
	}
}

func TestNetBps_OnlyTxChanged(t *testing.T) {
	prev := &NetStats{RxBytes: 1000, TxBytes: 500}
	curr := &NetStats{RxBytes: 1000, TxBytes: 1500}
	rx, tx := NetBps(prev, curr, 10)
	if rx != 0 {
		t.Errorf("rx should be 0 when unchanged, got %d", rx)
	}
	if tx != 100 {
		t.Errorf("tx = %d, want 100", tx)
	}
}

func TestNetBps_VerySmallInterval(t *testing.T) {
	prev := &NetStats{RxBytes: 0}
	curr := &NetStats{RxBytes: 100}
	rx, _ := NetBps(prev, curr, 0.001)
	if rx != 100000 {
		t.Errorf("rx = %d, want 100000", rx)
	}
}

func TestReadNetDev_OnLinux(t *testing.T) {
	stats, err := ReadNetDev()
	if err != nil {
		t.Skipf("not on Linux or /proc unavailable: %v", err)
	}
	if stats == nil {
		t.Fatal("stats should not be nil")
	}
}
