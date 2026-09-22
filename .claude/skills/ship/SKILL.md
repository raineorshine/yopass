---
name: ship
description: Ship the current branch to main without a pull request — rebase onto main, run the gate locally, fast-forward main with a single push, and watch the Cloudflare deploy that push triggers. Use when asked to ship, land, release, or deploy the branch.
---

# Ship

No pull request. The branch is rebased onto `main`, gated locally, and fast-forwarded onto `main` by
one push — which is also what deploys: Railway builds `main` and replaces production.

`.github/workflows/test.yml` runs `on: [pull_request]`, so nothing re-runs these tests after the
push; only Yamllint sees it. Step 3 is the only test run the change gets, which is why it comes after
step 2 and not before: gate the state that will land, not the state you wrote.

## 1. Commit what is in the tree

```sh
git status --porcelain
```

Commit the branch's own work. Anything unrelated stays behind and is named in the report — never
swept into the ship.

## 2. Rebase onto `main`

```sh
git fetch origin
git rebase origin/main
```

`main` is linear and stays that way. Resolve conflicts here, before the gate.

## 3. Run the gate locally

Scope it to what the branch touches — `git diff --name-only origin/main...HEAD` — and run it after
the rebase, on the rebased tree.

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
so a port another project happens to hold turns the run into a wall of failures against someone
else's app — it is not a flake, and rerunning on a free port is the fix. CI runs chromium, firefox
and webkit; chromium is the gate here unless the change is browser-specific.

**Landing site** (`microsite/`, `docs/`):

```sh
cd microsite && npm ci && npm run build
```

A failing gate ends the ship. Fix it, then start again at step 2.

## 4. Check that nobody else is deploying

Every push to `main` rebuilds production — there are no per-path exemptions, because Railway builds
the whole repo. List sessions (`mcp__ccd_session_mgmt__list_sessions`) and look for another `💾 `; if
one is there, wait for it rather than racing it. Set `💾 ` on this session's title before the push,
replacing whatever prefix is there. Say nothing about it.

## 5. Push to `main`

```sh
git push origin HEAD:main
```

No checkout: `main` is checked out in the primary worktree, and the push is refused unless it
fast-forwards. A rejection means `main` moved — go back to step 2.

The primary worktree's local `main` is left behind; it catches up on its next pull.

## 6. Watch the deploy

The Railway `securesend` project builds this repo's `Dockerfile` from `main` and swaps
`securesend.reverecollection.org` when the new container passes its healthcheck. The previous
deployment keeps serving until then, so a failed build is a failed ship, not an outage.

There is no `railway` CLI on this machine; the dashboard is the source of truth:
<https://railway.com/project/7ad4be25-6353-468c-9ab6-da3d81e080f6>

The build starts within seconds of the push. Ignore the service settings' "Auto deploy unavailable"
notice — it is stale, and the Deployments tab is what tells you the truth.

Report whether the deployment went ACTIVE. A ship is not done at the push.

## 7. Set the title

Set `🚀 ` on this session's title, replacing whatever prefix is there. This is the last step, after
the push has landed — never earlier, and nothing restores it, because a ship that fell over never set
it. Say nothing about it in the response.

The glossary arrives from the `emotive` plugin's `SessionStart` hook. Do not restate it.
