# 这是后端占位构建文件：backend 中有 go.mod 和可执行的 main package 后才会使用。
FROM golang:1.27-alpine AS build

WORKDIR /src

COPY go.mod go.sum* ./
RUN go mod download

COPY . .

# 默认入口是 backend 根目录；若以后使用 cmd/server，构建时改为：
# docker compose build --build-arg GO_BUILD_TARGET=./cmd/server backend
ARG GO_BUILD_TARGET=.
RUN CGO_ENABLED=0 GOOS=linux go build \
    -trimpath \
    -ldflags="-s -w" \
    -o /out/server \
    "${GO_BUILD_TARGET}"

FROM alpine:3.22 AS runtime

RUN adduser -D -u 10001 appuser
COPY --from=build /out/server /usr/local/bin/server

USER appuser
EXPOSE 8080

ENTRYPOINT ["server"]
