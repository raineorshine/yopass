---
name: ship
description: Ship the current branch to main without a pull request — merge main, run the gate locally, fast-forward main with a single push, and watch the Cloudflare deploy that push triggers. Use when asked to ship, land, release, or deploy the branch.
---

# Ship

No pull request. The branch takes `main` in, is gated locally, and is fast-forwarded onto `main` by
one push — which is also what deploys.

`.github/workflows/test.yml` runs `on: [pull_request]`, so nothing re-runs these tests after the
push. Step 3 is the only test run the change gets.

## 1. Commit what is in the tree

```sh
git status --porcelain
```

Commit the branch's own work. Anything unrelated stays behind and is named in the report — never
swept into the ship.

## 2. Merge `main`

```sh
git fetch origin
git merge origin/main
```

Conflicts are resolved here, before the gate, so the gate runs against what will actually land.

## 3. Run the gate locally

Scope it to what the branch touches — `git diff --name-only origin/main...HEAD`.

**Go** (`cmd/`, `pkg/`, `go.mod`):

```sh
go test ./cmd/... ./pkg/...
```

The Redis, Memcached and DynamoDB tests skip themselves unless `REDIS_URL`, `MEMCACHED` and
`DYNAMODB_ENDPOINT` are set — CI runs them against service containers. Start the container and set
the variable when the change is in a storage backend; otherwise the skips are expected.

**CDK** (`deploy/cdk/`):

```sh
cd deploy/cdk && go test .
```

**Sharing app** (`website/`) — through Yarn 1, per `AGENTS.md`; Corepack's Yarn 4 fails on the v1
lockfile:

```sh
cd website
npx --yes yarn@1.22.22 install --frozen-lockfile
npx --yes yarn@1.22.22 tsc && npx --yes yarn@1.22.22 run lint
npx --yes yarn@1.22.22 test:unit
port=$(for p in $(seq 3200 3300); do lsof -nP -iTCP:$p -sTCP:LISTEN >/dev/null 2>&1 || { echo $p; break; }; done)
PORT=$port npx --yes yarn@1.22.22 test:e2e --project=chromium
```

The port has to be one you confirmed free. Playwright reuses any server already answering that URL,
so a port another project happens to hold turns the run into 151 failures against someone else's
app — it is not a flake, and rerunning on a free port is the fix. CI runs chromium, firefox and
webkit; chromium is the gate here unless the change is browser-specific.

**Landing site** (`microsite/`, `docs/`):

```sh
cd microsite && npm ci && npm run build
```

A failing gate ends the ship. Fix it, then start again at step 2.

## 4. Check that nobody else is deploying

Only when the push touches `website/**`, `microsite/**` or `docs/**` — those are what deploy. Skip
this step for a push that touches none of them.

Otherwise the next step deploys production: list sessions (`mcp__ccd_session_mgmt__list_sessions`)
and look for another `💾 `; if one is there, wait for it rather than racing it. Set `💾 ` on this
session's title before the push, replacing whatever prefix is there. Say nothing about it.

## 5. Push to `main`

```sh
git push origin HEAD:main
```

No checkout and no merge of `main` into itself: `main` is checked out in the primary worktree, and
the push is refused unless it fast-forwards. A rejection means `main` moved — go back to step 2.

The primary worktree's local `main` is left behind; it catches up on its next pull.

## 6. Watch the deploy

A push touching `website/**` deploys the `yopass-share` Cloudflare Pages project;
`microsite/**` or `docs/**` deploys `yopass-site`. A push touching neither deploys nothing, and
there is nothing to watch.

```sh
gh run list --branch main --limit 3
gh run watch <id>
```

Report whether the deploy succeeded. A ship that triggered a deploy is not done when the push lands.

## 7. Set the title

Set `🚀 ` on this session's title, replacing whatever prefix is there. This is the last step, after
the push has landed — never earlier, and nothing restores it, because a ship that fell over never set
it. Say nothing about it in the response.

The glossary arrives from the `emotive` plugin's `SessionStart` hook. Do not restate it.
