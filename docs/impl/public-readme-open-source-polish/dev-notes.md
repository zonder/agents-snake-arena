# Dev Notes: Public README / Open-Source Repo Polish

## What changed
- Replaced the placeholder root `README.md` with a public-facing project overview.
- Wrote the README from verified repo facts in `package.json`, `src/server/index.ts`, `src/shared/contracts.ts`, `public/`, and Playwright config.
- Added run, build, and test instructions that map directly to existing npm scripts.
- Added runtime caveats covering in-memory state, restart behavior, and single-process deployment assumptions.

## Accuracy decisions
- Explicitly described the current client as static vanilla HTML/CSS/JavaScript served from `public/`.
- Explicitly avoided older React/Vite wording found in stale planning docs because the checked-in implementation does not use that stack.
- Included reconnect/session-resume support and touch controls because both are represented in current contracts/client code.

## Deviations
- No code changes were required; this stayed documentation-only.
- Did not add screenshots, badges, or external links because none were required by the spec and no verified assets/URLs were present in the repo.

## Validation
- Confirmed README commands against `package.json` scripts.
- Confirmed default local port and build metadata endpoint from `src/server/index.ts`.
- Confirmed gameplay capability wording from `src/shared/contracts.ts` and the static client implementation.
