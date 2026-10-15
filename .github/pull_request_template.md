## What

<!-- One or two sentences on what this PR changes. -->

## Why

<!-- The problem it solves or the goal it serves. -->

## How it was tested

- [ ] `npm run ci` passes locally (lint, typecheck, unit tests, build)
- [ ] `npm run test:contracts` if `contracts/` changed
- [ ] Checked in the browser (desktop and mobile) if the UI changed

## Risk

- [ ] Touches anything that signs, sends or prices a transaction (`src/lib/web3/`)
- [ ] Touches `contracts/` (needs a redeploy and a README update)
- [ ] None of the above
