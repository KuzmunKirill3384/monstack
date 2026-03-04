# Аудит подсистемы сбора процессов Monstack

## 1. Архитектура

### Цепочка данных

```
Linux /proc
  /proc/[pid]/stat, /proc/[pid]/status, /proc/[pid]/io
    ↓
agent/internal/procs/procs.go
  collectAll() → readPidStat, readPidStatus, readPidIO
  TopN() → TopNByCPUAndRSS()
    ↓
[]procs.ProcInfo { PID, Name, CPUPercent, RSSMB, IOReadBps, IOWriteBps, State }
    ↓
agent/internal/sampler/sampler.go
  Sample() → procs.TopN() при shouldSampleProcs(now)
    ↓
agent/internal/encoder/encoder.go
  ProcessDTO → IngestBatchDTO
    ↓
agent/internal/transport/transport.go
  POST /v1/ingest (gzip)
    ↓
backend ingest.controller → ingest.service
  prisma.procSnapshot.createMany()
    ↓
backend processes.service
  findRange(hostId, from, to, limit)
    ↓
Web ProcessTable / tools/term TUI
  Сортировка, фильтрация, отображение
```

### Модули

| Путь | Роль |
|------|------|
| `agent/internal/procs/procs.go` | Сбор из /proc, парсинг stat/status/io, TopN |
| `agent/internal/sampler/sampler.go` | Оркестрация: tick, shouldSampleProcs, вызов TopN |
| `agent/internal/service/service.go` | Цикл tick → Sample → Encode → SendIngest |
| `agent/internal/config/config.go` | ProcessIntervalSec: 30, ProcessTopN: 15 |
| `agent/internal/encoder/encoder.go` | ProcessDTO, JSON, gzip |
| `agent/internal/transport/transport.go` | POST /v1/ingest |
| `backend/src/ingest/ingest.service.ts` | Сохранение ProcSnapshot |
| `backend/src/processes/processes.service.ts` | findRange, fallback без time filter |
| `tools/term/tui.js`, `tools/term/utils.js` | TUI: sortProcs, formatProcRow |

---

## 2. Парсинг `/proc/[pid]/stat`

### Реализация (корректная)

```go
lparen := strings.IndexRune(s, '(')
rparen := strings.LastIndex(s, ")")
name = s[lparen+1 : rparen]
rest := strings.Fields(s[rparen+2:])
state = rest[0]
utime, _ = strconv.ParseUint(rest[11], 10, 64)
stime, _ = strconv.ParseUint(rest[12], 10, 64)
rssPages, _ = strconv.ParseUint(rest[21], 10, 64)
```

- **Comm в скобках**: извлечение между первой `(` и последней `)` обрабатывает команды с пробелами и вложенными скобками.
- **Индексы полей**: после comm идёт state (rest[0]), utime (14), stime (15), rss (24) — соответствуют man proc.
- **Проблема**: `ParseUint` игнорирует ошибки — при невалидных значениях получаем 0 без предупреждения.

### Чтение status, io, cmdline

- **status**: VmRSS в KB — используется для уточнения RSS.
- **io**: rchar, wchar для расчёта IOReadBps, IOWriteBps.
- **cmdline**: **не используется** — только comm из stat (до 255 символов).

---

## 3. CPU usage

**Формула**: `cpuPct = (utime+stime)_delta * 100 / (CLK_TCK * intervalSec)`.

- `tickMult = 100 / (100 * intervalSec)` при `intervalSec > 0`.
- Деление на 0 защищено.
- PID reuse: при `curTicks <= prevTicks` CPU = 0.
- При первом снимке (нет prev) все процессы имеют CPU = 0; сортировка по `comb = cpuPct + rssMB/100`.

---

## 4. Фильтрация

- Явной фильтрации `pid==0`, `cpu==0`, `memory==0` нет.
- `/proc/0` обычно отсутствует.
- Процессы с нулевым CPU участвуют в TopN по комбинированному scores.

---

## 5. Цикл обновления

- Tick каждые ~10 с (IntervalSec + jitter).
- Процессы: `shouldSampleProcs` — `now.Sub(lastProcAt) >= 30s`.
- При первом запуске `lastProcAt` нулевое → первый Sample включает процессы.
- **Важно**: агент в Docker должен использовать `pid: host`, иначе видит только процессы контейнера.

---

## 6. Обработка ошибок

| Проблема | Файл | Описание |
|----------|------|----------|
| Тихий skip при ошибке readPidStat | procs.go:123 | `if err != nil { continue }` — процесс не попадает в список |
| Игнор ошибки readPidStatus | procs.go:127 | `rssFromStatus, _ := readPidStatus(pid)` |
| Игнор ошибки readPidIO | procs.go:130 | `rchar, wchar, _ := readPidIO(pid)` |
| Ошибка TopN только Debug | sampler.go:102 | `s.logger.Debug("procs sample failed", ...)` — при Info не видно |
| ParseUint без проверки | procs.go:46-48 | Некорректные значения дают 0 |

---

## 7. Сортировка и UI

- Агент: `sort.Slice` по `comb = cpuPct + rssMB/100`.
- Backend: `orderBy: { ts: 'desc' }`, take limit.
- TUI/Web: `sortProcs(procs, sortBy, sortDesc)` — pid, name, cpu_pct, rss_mb, state.
- Дубликаты PID в одной выборке отсекаются через `seen` в TopNByCPUAndRSS.

---

## 8. Список найденных проблем

### Критичные / средние

1. **Лог ошибки procs на Debug** — при сбое TopN (например, нет доступа к /proc) в production логах ничего не видно.
2. **ParseUint без проверки** — при повреждённом stat могут быть нули/падения.
3. **Нет unit-тестов парсера stat** — только тесты TopN с готовыми ProcRaw.

### Низкие

4. Ошибки readPidStat/readPidStatus/readPidIO не логируются.
5. cmdline не читается — только comm (обрезается до 255 символов).
6. Нет явной фильтрации pid=0 (зависит от системы).

---

## 9. Рекомендации

### Архитектура

```
collector
 ├── cpu        (collectors.ReadCPUStat)
 ├── memory     (collectors.ReadMeminfo)
 ├── disk       (collectors.DiskUsedPctFirst)
 ├── network    (collectors.ReadNetDev)
 └── processes  (procs.TopN)
```

Текущая структура близка к этому; procs изолирован в отдельном пакете.

### Debug режим

Запуск с `--debug` или `AGENT_LOG_LEVEL=debug`:
- Логировать кол-во собранных процессов.
- Логировать ошибки readPidStat/readPidStatus/readPidIO.
- Логировать ошибки TopN на уровне Warn.

### Улучшения process collector (уровень htop)

- **PID, USER, CPU, MEM, VSZ, RSS, STATE, TIME, COMMAND**:
  - USER: Uid из /proc/[pid]/status.
  - VSZ: из stat (поле 23) или status VmSize.
  - TIME: (utime+stime) / CLK_TCK в формате MM:SS.
  - COMMAND: /proc/[pid]/cmdline (с заменой \0 на пробелы) с fallback на comm.

### ProcessTopN

По умолчанию 15 — для монитора может быть мало. Рекомендуется `AGENT_PROCESS_TOP_N=100` или выше при необходимости.

---

## 10. Внесённые исправления

### 10.1 Лог ошибки procs (sampler.go)

**Было:** `s.logger.Debug("procs sample failed", ...)` — при LogLevel=info не видно.

**Стало:** `s.logger.Warn("procs sample failed", ...)` — ошибки видны в production.

**Дополнительно:** при успешном сэмпле добавлен `s.logger.Debug("procs sampled", zap.Int("count", len(procsList)))` для debug-режима.

### 10.2 ParseUint с проверкой (procs.go)

**Было:** `utime, _ = strconv.ParseUint(rest[11], 10, 64)` — при ошибке парсинга возвращались нули.

**Стало:** проверка `err` и возврат ошибки с контекстом (`fmt.Errorf("parse utime: %w", err)`).

### 10.3 Вынесение парсера stat (procs.go)

**Было:** логика парсинга только в `readPidStat`, тестировать без /proc невозможно.

**Стало:** функция `parseStatString(s string)` — чистая логика парсинга; `readPidStat` читает файл и вызывает её. Добавлены unit-тесты `TestReadPidStat_CommInParens` для строк с пробелами и вложенными скобками в comm.

### 10.4 Debug режим

- Флаг `--debug` в `monagent` → LogLevel=debug.
- Docker: `AGENT_DEBUG=1` или `AGENT_DEBUG=true` → добавление `-debug` к команде.
- При `--debug` логируются: `procs sampled`, `ingest sent`, и т.д.
