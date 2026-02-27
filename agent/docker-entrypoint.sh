#!/bin/sh
set -e
: "${SERVER_URL:=http://backend:3000}"
: "${HOST_ID:=a0000000-0000-0000-0000-000000000001}"
: "${HOST_TOKEN:=local-dev-token}"
cat <<EOF > /tmp/config.yaml
server_url: "$SERVER_URL"
host_id: "$HOST_ID"
host_token: "$HOST_TOKEN"
interval_sec: 10
process_interval_sec: 30
process_top_n: 15
log_level: info
disk_paths:
  - "/"
http_timeout_sec: 30
http_retries: 3
EOF
exec monagent -config /tmp/config.yaml
