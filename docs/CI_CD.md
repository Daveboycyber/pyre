# CI/CD

How code gets from a branch to production, and what checks it on the way.

```
 feature branch ──► pull request ──────────────────────► merge to main ──► production
                     │                                    │                  │
                     ├─ CI: app (lint, types, tests,      ├─ CI runs again   ├─ Smoke test
                     │       build)                       ├─ CodeQL          │  (pages + API)
                     ├─ CI: contracts (forge build/test)  ├─ Contract watch  │
                     ├─ CodeQL security scan              │  (if contracts/  │
                     └─ Vercel preview deploy             │   changed)       │
                                                          └─ Vercel deploy ──┘
```

## Workflows

| Workflow | File | Runs on | What it does |
|---|---|---|---|
| **CI** | `.github/workflows/ci.yml` | every PR, pushes to `main` | **App:** `npm ci` → lint → typecheck → unit tests → production build. **Contracts:** `forge build` → `forge test` (16 tests, including a fuzz test). |
| **CodeQL** | `.github/workflows/codeql.yml` | PRs to `main`, pushes to `main`, weekly | GitHub's security scan for JS/TS (`security-extended` queries). Findings appear under *Security → Code scanning*. |
| **Contract watch** | `.github/workflows/contract-watch.yml` | weekly, `contracts/**` changes on `main`, manual | Confirms the live PyreBatch bytecode still matches `contracts/PyreBatch.sol` and that its settings are sane (fee ≤ cap, treasury set, no pending ownership transfer). |
| **Production smoke test** | `.github/workflows/smoke.yml` | after every successful **Production** deploy | Checks `/`, `/clean`, `/fees`, `/privacy`, `/terms` and `/stock-tokens.json` return 200. Warns if `/api/stock-tokens` returns nothing. |
| **Dependabot** | `.github/dependabot.yml` | weekly (npm), monthly (actions) | Opens grouped update PRs, which go through CI like any other PR. |

## Deployments (CD)

Deploys are handled by **Vercel's GitHub integration**, not by a workflow:

- every PR gets a **preview deployment** (linked in the PR checks)
- every push to `main` deploys to **production**
- the smoke test above runs once Vercel reports the production deploy succeeded

Database migrations run during `npm run build` on Vercel and are skipped when `DATABASE_URL` is not set (CI and previews).

## Run the checks locally

```bash
npm run ci              # lint + typecheck + unit tests + build, same as the CI app job
npm run test:contracts  # needs Foundry; first time: cd contracts && forge install foundry-rs/forge-std@v1.10.0 --no-git
contracts/script/verify-deployment.sh   # live bytecode + settings check
```

`npm run test:scripts` covers the platform tooling in `scripts/`. Some of those tests need the platform's `.grok/` folder, which is not in the repo, so they are not part of CI.

## Recommended repository settings

A repo admin should set these once (*Settings → Branches → Add rule* for `main`):

- **Require a pull request before merging**, with at least 1 approval
- **Require status checks to pass:** `App · lint, types, tests, build`, `Contracts · forge build, test`, `Analyze · javascript-typescript`, `Vercel`
- **Require branches to be up to date before merging**
- **Do not allow force pushes or deletions**

Also enable *Settings → Code security → Private vulnerability reporting* so the link in `SECURITY.md` works.

## Not enforced yet

- **Prettier.** About 65 files predate the formatter config, so a `prettier --check` gate would fail on untouched code. Run `npm run format` in one dedicated PR, then add `npx prettier --check .` to the app job.
