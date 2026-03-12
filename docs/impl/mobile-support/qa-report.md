# QA Report — Mobile support

- Parent issue: `#40`
- PR: `#43`
- Branch: `feature/issue-40`
- Feature slug: `mobile-support`
- Dev URL: http://20.106.185.110:8081/
- QA date (UTC): 2026-03-12
- Verdict: **FAIL**

## Test approach
I validated the deployed branch in headless Chromium using Playwright with these viewports/devices:
- iPhone 13 portrait: `390x664`
- iPhone landscape: `844x390`
- iPad Gen 7 portrait: `810x1080`
- Desktop: `1440x900`

I exercised:
- entry create/join flow
- lobby ready flow
- transition into countdown/gameplay
- mobile rotation during live gameplay
- touch button input wiring
- swipe input wiring
- result/rematch visibility
- desktop regression basics

## Summary
The feature is **not ready to pass QA** because active mobile gameplay overflows the viewport on phone-sized screens.

Two blocking layout defects were reproduced consistently:
1. **Phone portrait gameplay is not actually board-first/fully visible during countdown/live play.** On iPhone 13 portrait, the board bounding rect during countdown was `top: -183`, `bottom: 131`, `width: 314`, `height: 314`, meaning the board was pushed substantially above the visible viewport.
2. **Phone landscape support is broken.** After rotating the same session to `844x390`, the app switched to `data-layout-mode="tablet"` and rendered the board at `734x734` with bounding rect `top: -428`, `bottom: 306`, which leaves much of the gameplay surface off-screen.

Those failures break the acceptance criteria around phone usability, landscape usability, portrait-preferred presentation, board-first readability, and the full mobile gameplay flow.

## Acceptance criteria mapping

| AC | Status | Evidence |
|---|---|---|
| 1. The game is usable on phones and tablets. | **FAIL** | Tablet create/lobby flow worked (`data-layout-mode="tablet"`). Phone entry/lobby flow also worked, but phone gameplay was not fully usable because the board was rendered off-screen in active play (`top: -183` in portrait countdown, `top: -428` in landscape). |
| 2. The game supports both portrait and landscape orientations. | **FAIL** | Portrait rendered as `mobile-portrait`, but landscape on phone switched to `tablet` mode and overflowed badly with a `734x734` board inside a `844x390` viewport. |
| 3. Portrait provides the preferred mobile experience. | **FAIL** | Portrait countdown/gameplay still overflowed upward. The board was not fully visible on-screen in the preferred phone layout. |
| 4. The full product flow works on mobile: create/join, lobby, game, result, and rematch. | **FAIL** | Create/join and lobby passed. Result/rematch UI appeared. However, the core gameplay/countdown phase on phone was not fully visible, so the full mobile flow is not acceptable end-to-end. |
| 5. Players can control the snake via swipe input. | **PASS** | Instrumented the client and verified swipe on `#gameStage` emitted `player:direction:set` from the live deployed app. |
| 6. Players can control the snake via on-screen directional controls. | **PASS** | Instrumented the client and verified tapping the on-screen control buttons emitted `player:direction:set` from the live deployed app. |
| 7. Mobile layouts preserve readable UI and a board-first presentation. | **FAIL** | Active phone gameplay violated board-first presentation. On iPhone portrait, the board rect was partly off-screen (`top: -183`). In phone landscape, the board overflow was severe (`top: -428`). The gameplay sound toggle also became non-visible in the active phone gameplay viewport because the content stack overflowed. |
| 8. Mobile support preserves current sound behavior and current gameplay rules. | **PASS (limited)** | I verified the sound toggle remains present and usable on entry, and mobile touch input routes through the same `player:direction:set` transport as desktop. In headless browser QA I cannot confirm audible output quality, but there was no evidence of gameplay-rule divergence in the input path tested. |
| 9. Desktop behavior remains intact after the mobile support changes. | **PASS** | On desktop (`1440x900`), the app stayed in `data-layout-mode="desktop"`, touch controls stayed hidden, the controls hint remained visible, the board rendered at `652x652`, and keyboard input emitted `player:direction:set` as expected. |

## Detailed evidence

### Passing checks
- Phone portrait entry page loaded with `data-layout-mode="mobile-portrait"`.
- Phone create room / join room / lobby / ready interactions worked.
- iPad portrait create/lobby flow worked with `data-layout-mode="tablet"`.
- Result/rematch UI was visible on mobile after a round ended.
- On-screen touch buttons emitted `player:direction:set`.
- Swipe gestures emitted `player:direction:set`.
- Desktop entry/gameplay remained in `desktop` mode, touch controls stayed hidden, and keyboard input still emitted `player:direction:set`.

### Blocking defects

#### Defect 1 — Phone portrait gameplay overflows upward during countdown/live play
**Severity:** High

**Reproduction steps**
1. Open the dev URL on a phone-sized viewport (`390x664`, iPhone 13 emulation).
2. Create a room on one client and join from a second phone client.
3. Ready both players.
4. Observe the gameplay screen during countdown.

**Actual result**
- The board bounding rect was measured at `top: -183`, `bottom: 131`, `width: 314`, `height: 314`.
- This places a large portion of the board above the visible viewport during active gameplay.
- The gameplay sound button also ceased to be visible in the active gameplay viewport (`getBoundingClientRect()` collapsed to zero in the tested state because it was no longer rendered within the visible stack).

**Expected result**
- The board should remain fully visible and prioritized on phone portrait during countdown/live play.
- Important gameplay controls/status should remain reachable and readable.

#### Defect 2 — Phone landscape rotates into an unusable overflowed layout
**Severity:** Critical

**Reproduction steps**
1. Start the same phone session as above.
2. Rotate the active gameplay viewport to landscape (`844x390`).
3. Observe the gameplay layout after rotation.

**Actual result**
- The panel reported `data-layout-mode="tablet"` instead of a phone landscape mode.
- The board bounding rect became `top: -428`, `bottom: 306`, `width: 734`, `height: 734` in a `844x390` viewport.
- Large parts of the gameplay surface remained off-screen.

**Expected result**
- Phone landscape should remain usable and visible, with the board fitting the available height and the surrounding UI compressing appropriately.

## Notes / limitations
- This QA was run in headless browser automation, so audible sound output could not be subjectively validated by ear.
- For input verification, I instrumented the browser session and confirmed that touch buttons and swipe gestures both emit the same `player:direction:set` client event used by the desktop path.

## Final verdict
**FAIL**

The mobile input wiring is present and desktop behavior appears intact, but the layout currently fails core mobile gameplay usability requirements on phone portrait and especially on phone landscape. These viewport overflow issues should be fixed before the feature proceeds.
