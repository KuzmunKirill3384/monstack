package collectors

import (
	"syscall"
)

func DiskUsedPct(path string) (float64, error) {
	var stat syscall.Statfs_t
	if err := syscall.Statfs(path, &stat); err != nil {
		return 0, err
	}
	bsize := stat.Bsize
	if bsize <= 0 {
		return 0, nil
	}
	total := stat.Blocks * uint64(bsize)
	free := stat.Bfree * uint64(bsize)
	if total == 0 {
		return 0, nil
	}
	if free > total {
		return 0, nil
	}
	used := total - free
	return 100.0 * float64(used) / float64(total), nil
}

func DiskUsedPctFirst(paths []string) (float64, error) {
	if len(paths) == 0 {
		paths = []string{"/"}
	}
	for _, p := range paths {
		v, err := DiskUsedPct(p)
		if err != nil {
			continue
		}
		return v, nil
	}
	return 0, nil
}
