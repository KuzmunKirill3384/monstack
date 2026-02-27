FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /monagent ./cmd/agent

FROM alpine:3.19
RUN apk --no-cache add ca-certificates
COPY --from=builder /monagent /usr/local/bin/monagent
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"]
