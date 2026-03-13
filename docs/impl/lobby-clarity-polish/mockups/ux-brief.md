# UX Brief — Lobby Redesign Round 2 for Issue #99

## Context
Parent issue: #99  
Feature slug: `lobby-clarity-polish`  
Working branch: `feature/issue-98`

The first mockup round was rejected because it still felt too close to the current lobby. This round deliberately pushes farther: larger structural changes, stronger hero treatments, more obvious pre-match staging, and more visibly different concepts from one another.

## What changed in this round
These concepts are **more visibly different than the previous round** because they do not share the same basic page skeleton.

- **Concept A** is a broadcast-style scoreboard with a faceoff layout and giant split-flap room code digits.
- **Concept B** is a theatrical event poster with a hero marquee, ticket-code module, and ceremonial launch ring.
- **Concept C** is a staged ready-room with a left-side channel rail and a “live guidance” main stage.

That means the stakeholder is now reacting to three genuinely different lobby models, not three variants of the same centered-card composition.

## Files included
- `overview.html` — side-by-side comparison of the three redesigned concepts on desktop and mobile
- `states.html` — same key product states shown through all three concepts
- `ux-brief.md` — this rationale and recommendation summary

## Shared UX goals preserved
Even with the bigger redesign swings, all concepts still preserve the requested direction:

1. **Retro arcade identity stays intact**
   - neon contrast, bold typography, cabinet/showmanship language
   - pre-match space feels game-like rather than generic app UI

2. **Room code remains obvious**
   - still above the fold
   - treated as a featured object, not a small label-value pair
   - tied directly to sharing / inviting behavior

3. **Player names and ready state are easier to parse**
   - clear “you” / slot ownership
   - stronger ready vs not-ready vs reconnecting labels
   - less ambiguity about who is blocking start

4. **Next-step guidance is explicit**
   - copy explains what the player should do now
   - copy explains what the system does next
   - auto-start behavior is clearer

5. **Desktop + mobile awareness is preserved**
   - each concept still has a stacked mobile version
   - primary CTA remains easy to reach on small screens
   - hierarchy remains readable when compressed

---

## Concept summaries

### Concept A — Scoreboard Showdown
**Core idea:** treat the lobby like a versus broadcast board.

**What makes it distinct**
- giant split-flap room-code board at center
- head-to-head player framing instead of stacked roster cards
- bottom “announcer desk” messaging for next-step guidance
- strongest sports/broadcast energy of the three

**Strengths**
- room code is almost impossible to miss
- player-vs-player framing makes the lobby feel match-oriented immediately
- very clear responsibility: you can see exactly which side is not ready
- desktop and mobile both adapt cleanly

**Risks / trade-offs**
- more “arena scoreboard” than “mysterious arcade cabinet”
- could feel a little sporty if the stakeholder wants something moodier

**Best if:** the stakeholder wants the clearest possible pre-match read while still getting a visibly different redesign.

---

### Concept B — Fight Poster
**Core idea:** make the lobby feel like a retro arcade event poster.

**What makes it distinct**
- strongest hero/logo treatment by far
- ticket-like room code presentation
- circular launch ring gives the ready/start moment a ceremonial feel
- information grouped like a show flyer, not a utility panel

**Strengths**
- biggest step away from the current implementation visually
- most memorable branded presentation
- strongest emotional payoff for countdown / start state
- feels intentionally “showtime” rather than “waiting room”

**Risks / trade-offs**
- needs discipline so spectacle does not outrank core information
- could be the hardest to balance on smaller screens

**Best if:** the stakeholder wants a lobby that feels like a real redesign and is comfortable with a more theatrical branded direction.

---

### Concept C — Ready Room Channel
**Core idea:** make the lobby feel like a live staging room with guided system feedback.

**What makes it distinct**
- left rail changes the navigation model completely
- main stage is organized around live status and queue progression
- feels more like entering a pre-match station than opening a static card
- strongest “guided lobby flow” of the three

**Strengths**
- best explicit explanation of what is happening now vs next
- reconnect rules fit naturally in the rail / channel model
- has a stronger sense of place than a standard panel layout
- could scale well if the game later adds more lobby guidance or rule surfacing

**Risks / trade-offs**
- slightly more system-like, less poster-like
- sidebar metaphor needs careful simplification on mobile

**Best if:** the stakeholder wants the lobby to feel more purpose-built and staged, with the clearest structural separation between code, status, and actions.

---

## Recommendation
**Recommended lead concept: Concept B — Fight Poster**

Why:
- It most directly addresses the stakeholder’s complaint that the previous round was still too similar to the current product.
- It has the strongest visual separation from the current lobby and the previous mockups.
- The hero/logo area, ticket-code treatment, and launch ring make it feel like a full redesign rather than a polish pass.

## Recommended fallback if the stakeholder wants stronger clarity than spectacle
**Concept A — Scoreboard Showdown** is the best fallback.

It still looks materially different from the current lobby, but it is easier to parse instantly and carries less risk of style overpowering utility.

## Suggested hybrid direction if the stakeholder likes multiple ideas
A promising hybrid would be:
- **Concept B’s hero / poster framing**
- **Concept A’s giant room-code board clarity**
- **Concept C’s explicit live guidance copy**

That combination would preserve the “real redesign” feel while keeping the start logic unmistakable.

## Final note for PM handoff
If these are shared in Discord, I’d frame the decision as:
1. Which overall structure feels strongest: **broadcast board / event poster / ready room**?
2. How bold should the final lobby feel: **clarity-first / theatrical / guided-system**?
3. Does the stakeholder want the countdown/start moment to feel more like a **scoreboard**, a **show reveal**, or a **system handoff**?
