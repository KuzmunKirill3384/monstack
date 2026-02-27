# OS metrics: binding to Linux subsystems

## CPU

- **Source:** `/proc/stat` (kernel).
- **Subsystem:** Kernel scheduler. Fields `user`, `nice`, `system`, `idle`, `iowait`, etc. are jiffies (clock ticks) per CPU and aggregate.
- **Usage:** Delta of (user+nice+system) / total delta over an interval gives CPU utilization %. Per-process CPU % from `/proc/<pid>/stat` (utime, stime) delta and `sysconf(CLK_TCK)`.

## Memory

- **Source:** `/proc/meminfo` (kernel).
- **Subsystem:** Kernel memory management (mm). MemTotal, MemFree, MemAvailable, Buffers, Cached reflect physical RAM and page cache.
- **Usage:** MemUsed = MemTotal - MemAvailable (or MemFree+Buffers+Cached on older kernels). Convert to MB for display.

## Load average

- **Source:** `/proc/loadavg`.
- **Subsystem:** Kernel exposes load average (runnable + uninterruptible) for 1, 5, 15 minutes.
- **Usage:** Display as-is for system load indication.

## Network

- **Source:** `/proc/net/dev` (kernel).
- **Subsystem:** Network device statistics (bytes/packets per interface).
- **Usage:** Delta of receive/transmit bytes over interval gives bps (bits or bytes per second). Exclude loopback for “real” traffic.

## Disk / FS

- **Source:** `statvfs()` (libc) on mount path; optionally `/proc/diskstats` for per-device IO.
- **Subsystem:** VFS and block layer. statvfs reports blocks (total/free/used) for the filesystem.
- **Usage:** used_pct = (used_blocks / total_blocks) * 100. diskstats give IOPS/throughput per device if needed.

## Processes

- **Source:** `/proc/<pid>/stat`, `/proc/<pid>/status`, `/proc/<pid>/io` (kernel).
- **Subsystem:** procfs; kernel exposes per-process scheduler (utime, stime), memory (VmRSS), and I/O (rchar, wchar) counters.
- **Usage:** Top-N by CPU (delta utime+stime) and RSS; optional IO deltas for read/write rate.
