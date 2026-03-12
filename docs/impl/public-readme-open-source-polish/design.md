# Design: Public README / Open-Source Repo Polish

## Purpose
This feature is a documentation architecture task, not an application architecture change. The goal is to make the repository safe and credible to expose publicly by replacing the placeholder `README.md` with a concise, accurate, contributor-friendly entry point.

The README must do two jobs well:
1. orient a first-time visitor within the first screen; and
2. give a developer enough trustworthy setup information to run and test the project locally.

## Architectural Framing
The README is the public documentation gateway for the repo. For this feature, treat it as a curated summary layer above the codebase and `docs/knowledge/*`, not as a dumping ground for every implementation detail.

That means the implementation should:
- summarize the product and technical shape in plain language;
- link deeper docs where appropriate instead of duplicating everything;
- prefer facts verified from the current repo state over older planning documents;
- explicitly avoid claiming stack pieces that are not present in the checked-in app.

## Critical Accuracy Constraint
Current repo inspection shows a mismatch between some knowledge docs and the actual implementation.

### Verified current implementation
- **Runtime:** Node.js
- **Language:** TypeScript on the server/shared layer
- **Realtime transport:** Socket.IO
- **Frontend delivery:** static assets from `public/` served by the Node server
- **Frontend implementation style:** vanilla HTML/CSS/JavaScript, not a React/Vite app in the current branch
- **Tests:** Vitest unit tests and Playwright E2E configuration
- **State model:** in-memory room/game state, no database

### Implication for README authoring
The README must describe the **actual shipped repo**, not the aspirational stack listed in older docs such as `docs/knowledge/stack.md` and `docs/knowledge/architecture.md`.

Do **not** say React or Vite are part of the current app unless implementation changes add them in the same branch.

## README Information Architecture
Recommended section order for `README.md`:

1. **Title + one-sentence value proposition**
   - Name the project clearly.
   - Explain that it is a realtime 2-player browser Snake game.

2. **What it is / Why it is interesting**
   - Short paragraph for public visitors.
   - Emphasize room-based multiplayer, quick rounds, ready-up flow, rematches, and browser play.

3. **Current feature highlights**
   - Bullet list of implemented capabilities.
   - Keep feature claims bounded to what is present now.

4. **How it works (high level)**
   - Thin client + server-authoritative multiplayer model.
   - Mention Socket.IO and in-memory room state.
   - Keep to 4–6 bullets max.

5. **Tech stack**
   - Split into server, client, realtime, testing, deployment/runtime.
   - Mention current verified stack only.

6. **Run locally**
   - Prerequisites
   - install
   - dev/start command
   - default local URL/port
   - what the command actually runs

7. **Testing**
   - `npm test`
   - `npm run test:e2e`
   - note base URL behavior for Playwright if relevant

8. **Deployment / runtime notes**
   - single-process deployment
   - in-memory state loss on restart
   - no persistence/database
   - Socket.IO/WebSocket requirement

9. **Project structure**
   - small repo map pointing to `public/`, `src/server/`, `src/shared/`, `tests/`, `docs/`

10. **Contributing / development notes**
   - lightweight contributor entry point
   - point to issues/PRs or docs if present
   - do not over-promise a full contributor guide

11. **Status / limitations**
   - call out MVP/prototype constraints plainly

## Content Guardrails
The implementation should keep these guardrails:

### Public-facing tone
- friendly and confident
- concise, not corporate
- understandable by both players and contributors

### Technical tone
- specific where commands or runtime behavior matter
- avoid architecture jargon in the opening sections
- move detailed caveats lower in the README

### Honesty rules
- no mention of infrastructure details that are unnecessary for public readers unless they affect behavior
- no outdated framework claims
- no promises about persistence, matchmaking, auth, or scalability
- no screenshots/GIF references unless real assets are committed and linked

## Source-of-Truth Hierarchy For README Claims
When implementation chooses wording, use this precedence order:

1. **Code and checked-in config**
   - `package.json`
   - `src/server/index.ts`
   - `src/shared/contracts.ts`
   - `public/index.html` and `public/app.js`
   - Playwright/Vitest config
2. **Current repo structure**
3. **Feature spec in `docs/impl/public-readme-open-source-polish/spec.md`**
4. **Knowledge docs**, only where they still match the codebase

If a knowledge doc conflicts with the code, the code wins.

## Required Implementation Decisions
The next agent should explicitly decide and encode:

### 1. Opening pitch
One short intro that answers:
- what is this?
- who is it for?
- why is it interesting?

### 2. Feature bullets
Suggested emphasis:
- create or join a room with a short code
- 2-player lobby and ready-up flow
- server-authoritative gameplay
- rematch loop
- reconnect/session-resume support if verified from current code/events
- mobile/touch controls only if described carefully and supported in the current UI

### 3. Stack wording
Use wording similar to:
- Node.js + TypeScript backend
- browser client served as static HTML/CSS/JavaScript
- Socket.IO for realtime multiplayer
- Vitest + Playwright for automated testing

### 4. Local run commands
Prefer exact commands from `package.json`:
- `npm install`
- `npm run dev`
- `npm test`
- `npm run test:e2e`

If both `dev` and `start` are documented, explain the difference in one line.

## Repo Areas Touched By This Feature
Primary file:
- `README.md`

Optional supporting touch points only if needed for accuracy:
- none required for architecture phase

This feature should remain documentation-only unless the implementation agent discovers a factual mismatch that requires a tiny follow-up correction.

## Validation Checklist For Implementation
Before handing off, implementation should verify:
- the README no longer contains placeholder content;
- the first screen explains the game without requiring code reading;
- every stack/tooling claim matches the current repo;
- local run instructions map to real scripts in `package.json`;
- testing instructions map to real commands/config;
- deployment/runtime caveats mention in-memory state and restart loss;
- contributor guidance is lightweight and consistent with current project maturity.

## Non-Goals
This feature does not require:
- code or gameplay changes
- new APIs or socket contracts
- contributor policy/legal docs
- screenshot production
- CI/CD changes
- docs site creation

## Recommended Implementation Order
1. Audit current repo facts and README placeholders.
2. Draft the README outline using the section order above.
3. Fill each section from verified sources.
4. Trim any speculative or stale claims.
5. Proofread for public-facing polish and scannability.

## Risks
- **Stale docs risk:** older knowledge docs may cause incorrect stack claims.
- **Oversharing risk:** README may become too long if it mirrors internal docs.
- **Underspecifying risk:** README may read well but omit actionable run/test commands.

## Mitigations
- Verify all technical claims against code/config before finalizing.
- Keep detailed internals behind links or a short structure section.
- Include exact commands and brief explanations.
