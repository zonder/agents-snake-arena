# QA Report — UI/UX polish pass

- Parent issue: #25
- PR: #28
- Branch: `feature/issue-25`
- Feature slug: `uiux-polish-pass`
- Dev URL: http://20.106.185.110:8081/
- QA date (UTC): 2026-03-12
- Verdict: **FAIL / BLOCKED**

## Summary
I verified that the dev deployment is live, that the updated UI shell/assets are being served, and that a basic two-player room flow on the deployed environment still works through live Socket.IO events. However, I could not complete end-to-end visual/audio QA because this headless VM does not have the libraries needed to launch a browser engine for rendered UI verification (`libatk-1.0.so.0` missing when attempting Playwright Chromium launch).

Because the acceptance criteria are primarily visual/audio and explicitly require validation of polish, juice, sound behavior, and layout stability, I am marking QA as **FAIL / BLOCKED** rather than issuing a pass without rendered-browser evidence.

## Evidence collected

### Deployment / asset verification
- `curl -I http://20.106.185.110:8081/` returned `HTTP/1.1 200 OK`.
- The served HTML includes the new retro-arcade shell and UI controls:
  - `Retro arcade multiplayer`
  - `Clean boards. Neon tension. Quick rematches.`
  - `Sound: on`
  - `countdownOverlay`
  - upgraded rematch/result banner structure
- The served CSS includes the new visual token system and polish hooks such as:
  - arcade color tokens (`--accent-primary`, `--accent-secondary`, `--accent-danger`)
  - glow tokens (`--glow-primary`, `--glow-secondary`, `--glow-danger`)
  - motion tokens (`--motion-fast`, `--motion-base`, `--motion-slow`)
- The served JS includes polish/audio wiring for:
  - `countdownOverlay`
  - sound toggle / audio manager
  - board flash effects
  - rematch banner state
  - build marker hydration

### Basic live functional smoke test on dev deployment
Using two temporary Socket.IO clients against the deployed app:
- created a room successfully
- joined from a second client successfully
- set both players ready successfully
- observed countdown events `3, 2, 1, 0`
- observed `game:start`
- observed live game state on a `30x30` board

This supports that the deployment is alive and the core room/game flow still functions at a protocol level.

## Acceptance criteria status

| # | Acceptance criterion | Status | Evidence |
|---|---|---|---|
| 1 | Clean retro arcade visual style across lobby, gameplay, result, and rematch screens | **Blocked** | Static HTML/CSS/JS clearly show the intended retro-arcade system, but no rendered-browser verification was possible. |
| 2 | Lobby/create/join flow feels visibly more polished than baseline | **Blocked** | New hero card, room-code hero, button treatments, and lobby structures are present in served assets, but not visually rendered/compared in-browser. |
| 3 | Countdown presentation is more prominent and more playful | **Blocked** | `countdownOverlay` wiring exists and live countdown events fire, but I could not visually confirm prominence/animation quality. |
| 4 | Scoreboard/player panels are more polished and readable | **Blocked** | Upgraded score card/player card DOM and CSS are present, but readability needs rendered UI confirmation. |
| 5 | Noticeable but tasteful visual juice such as glow, pulse, collision flash, and win-state feedback | **Blocked** | Effect hooks exist in assets, but effect quality/readability cannot be verified without a browser render. |
| 6 | Rematch/result flow feels more inviting and polished | **Blocked** | New rematch panel/post-game banner structure is present, but I could not drive a full round to visually assess it. |
| 7 | Basic sound effects are present and enabled by default | **Blocked** | Sound toggle defaults to `Sound: on` and audio manager wiring exists, but actual audible playback could not be verified in this environment. |
| 8 | Board-first layout preserved and no viewport jumping | **Blocked** | Design/implementation explicitly reserve gameplay regions, but layout stability requires rendered-browser observation during countdown/result transitions. |
| 9 | Overall experience feels smoother and more fun while preserving gameplay behavior | **Partial / Blocked** | Gameplay behavior appears preserved at the socket/protocol level during smoke test, but the overall “feel” portion requires rendered-browser verification. |

## Blocking issue

### Browser-based QA could not run on the VM
**Reproduction**
1. Install Playwright in a temp directory.
2. Run a simple Chromium launch against `http://20.106.185.110:8081/`.
3. Launch fails immediately.

**Observed error**
- `error while loading shared libraries: libatk-1.0.so.0: cannot open shared object file: No such file or directory`

**Impact**
- Prevents screenshot-based or rendered DOM/CSS verification.
- Prevents reliable audio verification.
- Prevents confirming whether countdown, result, rematch, glow/pulse/flash, and layout stability actually look correct in-browser.

## Recommendation
Do **not** mark QA complete yet. Re-run QA in an environment with a working browser stack (or provide a browser-capable QA runner/screenshot artifact path), then verify:
- lobby polish
- countdown animation/readability
- scoreboard readability
- board-first layout stability during state transitions
- result/rematch presentation
- sound playback/default-on behavior
