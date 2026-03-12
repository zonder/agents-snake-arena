# UI/UX Polish Pass — Dev Notes

## Implementation summary
- Reworked the vanilla frontend into a cleaner retro-arcade presentation system across entry, lobby, gameplay, result, and rematch states.
- Added a derived UI/effects layer in `public/app.js` that compares previous vs next lobby/game/rematch payloads to trigger countdown pulses, score pops, board flashes, rematch highlights, and sound cues.
- Kept existing Socket.IO contracts intact; all polish behavior is driven from the current payloads plus local UI state.
- Added a lightweight Web Audio manager with first-interaction unlock, local mute persistence, and silent failure when audio is blocked.
- Added reserved gameplay overlay regions (`countdownOverlay`, `boardFxLayer`, upgraded result banner/player cards) to improve polish without reintroducing board layout jumps.
- Added reduced-motion-aware behavior by relying on container-level effects and CSS media-query fallbacks instead of per-cell gameplay animations.

## Notable implementation decisions
- Used synthesized Web Audio tones instead of bundling assets to keep the change self-contained and low-overhead.
- Kept the board DOM reuse strategy (`ensureBoard`) and limited live-game FX to board-level flashes plus score-card animation to avoid per-tick performance cost.
- Updated room-code copy feedback to reuse the existing status surface instead of adding a separate toast system.

## Minor deviations from architecture notes
- Added the sound toggle in the top bar instead of the gameplay HUD so the control stays available before and during matches.
- Reused existing status and card surfaces for acknowledgements rather than introducing a separate toast region.
- Review fix: centralized countdown FX de-duplication behind one global countdown effect key so `game:countdown`, `game:state`, and `game:start` cannot replay the same `3 / 2 / 1 / GO` pulse/audio step twice.
