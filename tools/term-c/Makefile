# Fast TUI (C): ncurses + libcurl. Refresh 500ms. No JSON lib — minimal parser.
# Deps: libncurses-dev libcurl-dev (apt) | ncurses curl (brew)

CC = gcc
CFLAGS = -O2 -Wall -Wextra
LDFLAGS = -lncurses -lcurl

monterm: main.c
	$(CC) $(CFLAGS) -o $@ main.c $(LDFLAGS)

clean:
	rm -f monterm

.PHONY: clean
