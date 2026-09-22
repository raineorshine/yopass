# Yopass

A fork of [Yopass](https://github.com/jhaals/yopass) — a self-hosted service for sharing secrets that
the browser encrypts before they reach the server. The Go server is `cmd/` and `pkg/`, the sharing app
is `website/` (React, Vite, Playwright), the landing site is `microsite/` (Docusaurus) with its prose
in `docs/`, and the Lambda/CDK stack is `deploy/cdk/`.

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
  this repo does not ship through PRs, so that local gate is the only test run a change gets.
- `🚀 ` ships to `main` by fast-forward push, no PR. `/ship` is that procedure — merge `origin/main`,
  gate, `git push origin HEAD:main`, watch the deploy — and sets the prefix itself once the push
  lands. `📦 ` holds until then.
- `🚙 ` is a look at the deployed page, or a `gh` login the session cannot do for itself.
- `💾 ` is a push to `main`, and `🔒 `/`🔓 ` are port 3000 — both below. `🔍 ` is inert here: nothing
  in this repo has a dry run that an apply follows.

**Pushing to `main` deploys production.** `deploy-cloudflare-share.yml` and
`deploy-cloudflare-site.yml` fire on any push to `main` touching `website/**` or
`microsite/**`/`docs/**`, and deploy to the Cloudflare Pages projects `yopass-share` and
`yopass-site`. Nothing locks that: two sessions pushing to `main` both deploy, and the workflows'
`concurrency` groups serialize the runs without serializing the branch. Before the push — and before
`gh workflow run deploy-cloudflare-*.yml`, which is the same deploy by hand — list sessions
(`mcp__ccd_session_mgmt__list_sessions`) and look for another `💾 `. Only a push that touches those
paths carries the prefix: both workflows are `if: github.ref == 'refs/heads/main'` and both filter on
paths, so a feature branch deploys nothing however often it is pushed, and a push to `main` touching
only Go, docs-for-agents or CI files deploys nothing either.

**Playwright reuses whatever is already listening, whatever it is.**
`website/playwright.config.ts` starts `yarn dev` on `PORT` (3000 by default) with
`reuseExistingServer` outside CI, and the check is only that something answers the URL: a dev server
from another worktree — or another project entirely — passes it, and the whole suite then runs green
or red against the wrong app. Pick a port and confirm it is free before an e2e run
(`lsof -nP -iTCP:$PORT -sTCP:LISTEN`) rather than assuming a high number is unused; `/ship` does
that. Port 3000 is the slot sessions actually contend for: a session that wants it — `yarn dev` for
a browser check — sets `🔓 ` before it starts and `🔒 ` while it holds it.
