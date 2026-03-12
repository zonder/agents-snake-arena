# QA Report — Mobile support

- Parent issue: `#40`
- PR: `#43`
- Branch: `feature/issue-40`
- Feature slug: `mobile-support`
- Dev URL: http://20.106.185.110:8081/
- QA rerun date (UTC): 2026-03-12
- Expected fix commit: `6bc1a83`
- Verdict: **BLOCKED / FAIL**

## Rerun status
This QA rerun is currently **blocked** because the dev environment is **not serving the requested refreshed build**.

Before running browser verification, I checked the live deployment metadata at `http://20.106.185.110:8081/build-info.json` with cache-busting disabled server-side (`Cache-Control: no-store`) and confirmed the server is still reporting:

- `commit`: `da6c72f`
- `displayVersion`: `v0.1.0+da6c72f`
- `builtAt`: `2026-03-12T11:03:44.888Z`

The requested fix for this rerun was commit `6bc1a83` (**Fix mobile gameplay viewport overflow**), so the dev URL does not yet match the version that QA was asked to validate.

## Evidence
- Build metadata response captured in `docs/impl/mobile-support/artifacts/rerun-20260312/build-info-check.json`
- Live headers from `/` returned `Cache-Control: no-store, max-age=0`, reducing the likelihood that this is a client-side cache artifact.
- Local checkout on `feature/issue-40` is at commit `6bc1a83`, confirming the branch has advanced beyond the currently deployed build.

## Blocking issue
**Blocker:** Dev deployment mismatch.

**Expected**
- Dev URL should serve build commit `6bc1a83` before rerun QA begins.

**Actual**
- Dev URL is still serving build commit `da6c72f`.

## What was and was not tested
### Completed
- Prepared a fresh QA checkout on branch `feature/issue-40`
- Synced checkout to `origin/feature/issue-40` at commit `6bc1a83`
- Verified the live dev endpoint and captured deployment metadata evidence

### Not run yet
- Phone portrait gameplay verification on the refreshed build
- Phone landscape gameplay verification on the refreshed build
- Layout-mode selection verification on the refreshed build
- Board-first visibility verification on the refreshed build
- Touch-controls/desktop-regression sanity on the refreshed build

## Next step
Redeploy dev from commit `6bc1a83` (or later commit that includes the same fix), then rerun QA against the refreshed URL.

## Final verdict
**FAIL / BLOCKED** until dev serves the expected fix build `6bc1a83`.
