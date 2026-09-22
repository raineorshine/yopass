# Yopass

A fork of [Yopass](https://github.com/jhaals/yopass) — a self-hosted service for sharing secrets that
the browser encrypts before they reach the server. The Go server is `cmd/` and `pkg/`, the sharing app
is `website/` (React, Vite, Playwright), the landing site is `microsite/` (Docusaurus) with its prose
in `docs/`, and the Lambda/CDK stack is `deploy/cdk/`.

## Fork, not upstream

`origin` is `raineorshine/yopass`; `upstream` is `jhaals/yopass`, and `gh` resolves to **upstream** by
default here — `gh run list` silently reports someone else's CI. `gh repo set-default
raineorshine/yopass` is set in this clone; pass `--repo raineorshine/yopass` from anywhere that
config does not reach.

## Where this deploys

Production is the Railway project `securesend`, environment `production`: the `yopass` service is
built from this repo's `Dockerfile` at `main` and serves `securesend.reverecollection.org` on port
1337, with a `Redis` service beside it for storage. Cloudflare holds the DNS for the domain and
nothing else — the record is a DNS-only CNAME to Railway.

A push to `main` starts a build within seconds. The service's settings claim "Auto deploy
unavailable" — a stale notice about the GitHub App; deploys fire regardless, which is what the
Deployments tab shows. `Wait for CI` on the service is off, and stays off: `test.yml` only runs on
pull requests, so a Railway deploy waiting on Actions would wait forever.

Three workflows in this repo are upstream's deploy paths and are disabled on purpose — leave them
that way. `deploy-cloudflare-share.yml` and `deploy-cloudflare-site.yml` publish `yopass.se` to
Cloudflare Pages projects that do not exist in this account, and `docker.yaml` pushes to upstream's
Docker Hub namespace with credentials this fork does not have.

## Website toolchain

`website/yarn.lock` is a **Yarn v1** lockfile and this machine's `yarn` is Corepack's Yarn 4, which
migrates the project on sight — writing a `website/.yarnrc.yml` that is not in git — and then fails
the install against the v1 lockfile. Run website commands through Yarn 1:

```sh
npx --yes yarn@1.22.22 install --frozen-lockfile
npx --yes yarn@1.22.22 test:unit
```

`website/node_modules` is gitignored and a worktree starts without it, so the install is the first
step of any website work.

## Session titles

The prefix glossary arrives from the `emotive` plugin; these are the parts that are specific to this
repo.

- `📦 ` means the local gate passed for what the branch touched: `go test ./cmd/... ./pkg/...` and
  `go test .` in `deploy/cdk`, `tsc` + `lint` + `test:unit` + `test:e2e` in `website/`,
  `npm ci && npm run build` in `microsite/`. `.github/workflows/test.yml` is `on: [pull_request]` and
  this repo does not ship through PRs, so that local gate is the only test run a change gets — only
  Yamllint runs on a push to `main`.
- `🚀 ` ships to `main` by fast-forward push, no PR. `/ship` is that procedure — rebase onto
  `origin/main`, gate, `git push origin HEAD:main`, watch the Railway deploy — and sets the prefix
  itself once the push lands. `📦 ` holds until then. `main` stays linear; nothing rebases what is
  already on it.
- `🚙 ` is a look at the live page after a ship, and anything else that needs the Railway dashboard:
  there is no `railway` CLI on this machine, so a session cannot read a build log or roll a
  deployment back by itself.
- `💾 ` is a push to `main`, and `🔒 `/`🔓 ` are port 3000 — both below. `🔍 ` is inert here: nothing
  in this repo has a dry run that an apply follows.

**A push to `main` rebuilds production.** The Railway service builds this repo's `Dockerfile` from
`main` and swaps `securesend.reverecollection.org` once the new container is healthy; the running
deployment serves until then, so a failed build is not an outage. Nothing serializes two sessions:
both pushes build, and the later one wins. Before pushing to `main` — and before clicking Redeploy in
the dashboard, which is the same act by hand — list sessions
(`mcp__ccd_session_mgmt__list_sessions`) and look for another `💾 `. A feature branch carries no
prefix: only `main` is connected to `production`, so it deploys nothing however often it is pushed.

**Playwright reuses whatever is already listening, whatever it is.**
`website/playwright.config.ts` starts `yarn dev` on `PORT` (3000 by default) with
`reuseExistingServer` outside CI, and the check is only that something answers the URL: a dev server
from another worktree — or another project entirely — passes it, and the whole suite then runs
against the wrong app. Pick a port and confirm it is free before an e2e run
(`lsof -nP -iTCP:$PORT -sTCP:LISTEN`) rather than assuming a high number is unused; `/ship` does that.
Port 3000 is the slot sessions actually contend for: a session that wants it — `yarn dev` for a
browser check — sets `🔓 ` before it starts and `🔒 ` while it holds it.
