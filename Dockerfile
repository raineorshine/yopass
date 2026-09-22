FROM golang:1.27-bookworm AS app
RUN mkdir -p /yopass
WORKDIR /yopass
COPY . .
ARG VERSION
# Railway exposes the deployed commit to the build; it stands in for the VERSION
# build-arg that a registry build would pass.
ARG RAILWAY_GIT_COMMIT_SHA
# cmd/ and pkg/ are the root module; go.work also pulls in deploy/cdk, whose AWS
# dependencies this image has no use for.
ENV GOWORK=off
RUN VERSION=${VERSION:-${RAILWAY_GIT_COMMIT_SHA:-$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")}} && \
    go build ./cmd/yopass && \
    go build -ldflags "-X main.version=${VERSION}" ./cmd/yopass-server

FROM node:24 AS website
COPY website /website
WORKDIR /website
RUN yarn install --frozen-lockfile --network-timeout 600000 && yarn build

FROM gcr.io/distroless/base
COPY --from=app /yopass/yopass /yopass/yopass-server /
COPY --from=website /website/dist /public
USER 1000
ENTRYPOINT ["/yopass-server"]
