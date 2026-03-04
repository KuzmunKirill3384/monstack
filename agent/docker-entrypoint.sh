#!/bin/sh
set -e
: "${SERVER_URL:=http://backend:3000}"
: "${HOST_ID:=a0000000-0000-0000-0000-000000000001}"
: "${HOST_TOKEN:=local-dev-token}"
: "${AGENT_COMMAND_SECRET:=}"
: "${AGENT_LOG_LEVEL:=info}"
: "${AGENT_INTERVAL_SEC:=10}"
: "${AGENT_PROCESS_INTERVAL_SEC:=30}"
: "${AGENT_PROCESS_TOP_N:=15}"
cat <<EOF > /tmp/config.yaml
server_url: "$SERVER_URL"
host_id: "$HOST_ID"
host_token: "$HOST_TOKEN"
interval_sec: $AGENT_INTERVAL_SEC
process_interval_sec: $AGENT_PROCESS_INTERVAL_SEC
process_top_n: $AGENT_PROCESS_TOP_N
log_level: "$AGENT_LOG_LEVEL"
disk_paths:
  - "/"
http_timeout_sec: 30
http_retries: 3
command_listen_addr: ":9090"
command_secret: "$AGENT_COMMAND_SECRET"
EOF
if [ "$AGENT_DEBUG" = "1" ] || [ "$AGENT_DEBUG" = "true" ] || [ "$AGENT_DEBUG" = "yes" ]; then
  exec monagent -config /tmp/config.yaml -debug
else
  exec monagent -config /tmp/config.yaml
fi
