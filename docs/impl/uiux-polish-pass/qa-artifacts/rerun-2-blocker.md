# Rerun 2 blocker

- QA rerun target branch: `feature/issue-25`
- Expected fix commit: `7273531` (`Fix post-game banner board displacement`)
- Dev deployment build marker observed from `/build-info.json`: `e431101`
- Result: the requested board-displacement fix is **not yet deployed** to the dev URL, so the rerun cannot validate the fix in the target environment.

Because the dev environment is still serving the pre-fix build, any browser-based verification against `https://dev.snakearena.website/` would only reconfirm the already-known failing state rather than the requested post-fix rerun.
