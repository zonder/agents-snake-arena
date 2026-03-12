# Feature Spec: Player Names / Identity

## Status
Draft for stakeholder approval

## Feature Summary
As a player, I want to choose and see a lightweight player name so that the multiplayer experience feels clearer, more personal, and easier to follow.

## Scope
In scope for this feature:
- player name entry before create/join
- required name input
- local name persistence for convenience
- displaying player names across key multiplayer states
- lightweight local nickname identity only

Out of scope for this feature:
- accounts/login
- global profiles
- usernames across devices
- profanity filtering for MVP
- uniqueness enforcement between players in the same room

## Stakeholder Decisions Captured
- Players enter their name **before create/join**.
- Name entry is **required**.
- Name rules for MVP:
  - max length: **12**
  - spaces: **allowed**
  - emoji: **not allowed**
  - profanity filtering: **skip for now**
- Names should appear in:
  - lobby
  - gameplay HUD
  - result screen
  - rematch screen
  - reconnect/disconnect messages
- The browser should **remember the last used name locally**.
- Duplicate names are **allowed**.
- Identity should remain **simple local nickname only**.

## Assumptions
- Local persistence can use browser storage.
- The remembered name is a convenience feature, not a secure identity system.
- Name validation should be lightweight and user-friendly.
- Displaying duplicate names is acceptable for MVP even if it can occasionally be ambiguous.

## User Scenarios

### Scenario 1: Enter a name before creating or joining
**As a player**, I want to set my name before entering the game flow so I feel identified from the start.

#### Expected behavior
- The create/join entry flow includes a required name field.
- The player cannot proceed without entering a valid name.
- The name is validated against the MVP rules.

### Scenario 2: See names throughout the multiplayer flow
**As a player**, I want to see both players’ names in the important game states so the experience feels more personal and understandable.

#### Expected behavior
- Names appear in the lobby.
- Names appear in the gameplay HUD.
- Names appear in result and rematch states.
- Names appear in reconnect/disconnect status messages where relevant.

### Scenario 3: Reuse my last name conveniently
**As a returning player**, I want the browser to remember my last used name so I don’t have to type it every time.

#### Expected behavior
- The last used valid name is remembered locally.
- The field is prefilled on return visits in the same browser.
- The player can still edit the remembered name before create/join.

## Functional Requirements
1. The entry flow must require a player name before create/join.
2. Name input must validate a maximum length of 12 characters.
3. Spaces must be allowed in names.
4. Emoji must not be allowed in names.
5. Profanity filtering is not required for MVP.
6. The browser must remember the last used valid name locally.
7. The remembered name must prefill the entry field on later visits in the same browser.
8. The system must display player names in the lobby.
9. The system must display player names in the gameplay HUD.
10. The system must display player names on result/rematch screens.
11. The system must display player names in reconnect/disconnect messaging where relevant.
12. Duplicate names must be allowed.
13. The feature must not introduce account/auth requirements.

## Non-Functional Requirements
- Name entry should remain lightweight and fast.
- Validation should be clear to the player.
- The feature must preserve current multiplayer flow and server-authoritative behavior.
- Local persistence should be simple and browser-scoped.

## Edge Cases
- A player enters only spaces.
- A player enters more than 12 characters.
- A player uses unsupported emoji characters.
- Both players choose the same name.
- A remembered name becomes invalid after the validation rules are applied.

## Acceptance Criteria
1. A player must enter a valid name before creating or joining a room.
2. Valid names may include spaces and must be 12 characters or fewer.
3. Emoji are rejected as invalid input.
4. The browser remembers the last used valid name locally.
5. The remembered name is prefilled when the player returns in the same browser.
6. Player names appear in the lobby.
7. Player names appear in the gameplay HUD.
8. Player names appear in result/rematch UI.
9. Player names appear in reconnect/disconnect messaging where relevant.
10. Duplicate names are allowed without blocking the flow.

## Open Notes for Implementation
- Validation copy should be friendly and concise.
- If character validation is technically awkward, the implementation should still preserve the stakeholder intent: names feel lightweight, readable, and non-emoji for MVP.
