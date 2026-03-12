import {
  PLAYER_NAME_MAX_LENGTH,
  type PlayerIdentityView,
  type PlayerNameValidationReason,
  type PlayerNameValidationResult,
} from './contracts.js';

const EMOJI_PATTERN = /\p{Extended_Pictographic}|\p{Emoji_Presentation}/u;

export function normalizePlayerName(input: unknown): string {
  return String(input ?? '').trim().replace(/\s+/g, ' ');
}

export function validatePlayerName(input: unknown): PlayerNameValidationResult {
  const normalized = normalizePlayerName(input);
  let reason: PlayerNameValidationReason | undefined;

  if (!normalized) reason = 'REQUIRED';
  else if (normalized.length > PLAYER_NAME_MAX_LENGTH) reason = 'TOO_LONG';
  else if (EMOJI_PATTERN.test(normalized)) reason = 'EMOJI_NOT_ALLOWED';

  return {
    valid: !reason,
    normalized,
    reason,
    message: reason ? 'Enter a name up to 12 characters without emoji.' : undefined,
  };
}

export function getDisplayName(name: string | null | undefined, fallbackLabel: string): string {
  return name && name.trim() ? name : fallbackLabel;
}

export function getPlayerLabel(slotIndex: 0 | 1): 'Player 1' | 'Player 2' {
  return slotIndex === 0 ? 'Player 1' : 'Player 2';
}

export function toPlayerIdentityView(player: { slotIndex: 0 | 1; name: string | null }): PlayerIdentityView {
  const label = getPlayerLabel(player.slotIndex);
  return {
    slotIndex: player.slotIndex,
    label,
    name: player.name,
    displayName: getDisplayName(player.name, label),
  };
}

export function formatPlayerReference(player: { slotIndex: 0 | 1; name: string | null }, options?: { disambiguateWith?: Array<string | null | undefined> }): string {
  const identity = toPlayerIdentityView(player);
  const others = (options?.disambiguateWith ?? []).filter((value): value is string => Boolean(value));
  const duplicate = identity.name ? others.some((other) => other === identity.name) : false;
  return duplicate ? `${identity.displayName} (${identity.label})` : identity.displayName;
}
