const socket = io();

const statusEl = document.getElementById('status');
const errorEl = document.getElementById('error');
const panelEl = document.querySelector('.panel');
const panelTopEl = document.getElementById('panelTop');
const entryEl = document.getElementById('entry');
const lobbyEl = document.getElementById('lobby');
const gamePanelEl = document.getElementById('gamePanel');
const roomCodeInput = document.getElementById('roomCodeInput');
const playerNameInput = document.getElementById('playerNameInput');
const nameHelpEl = document.getElementById('nameHelp');
const roomCodeDisplay = document.getElementById('roomCodeDisplay');
const gameRoomCodeEl = document.getElementById('gameRoomCode');
const playersEl = document.getElementById('players');
const readyButton = document.getElementById('readyButton');
const lobbyMessage = document.getElementById('lobbyMessage');
const phaseBadge = document.getElementById('phaseBadge');
const lobbyHeroTitleEl = document.getElementById('lobbyHeroTitle');
const lobbyHeroSubtitleEl = document.getElementById('lobbyHeroSubtitle');
const lobbyPosterCalloutEl = document.getElementById('lobbyPosterCallout');
const lobbyLaunchRingEl = document.getElementById('lobbyLaunchRing');
const lobbyLaunchRingValueEl = document.getElementById('lobbyLaunchRingValue');
const roomCodeHintEl = document.getElementById('roomCodeHint');
const lobbyHelpDialogEl = document.getElementById('lobbyHelpDialog');
const lobbyHelpButton = document.getElementById('lobbyHelpButton');
const roomCodeDigitsEl = document.getElementById('roomCodeDigits');
const lobbyStatusSummaryEl = document.getElementById('lobbyStatusSummary');
const lobbyNextStepLabelEl = document.getElementById('lobbyNextStepLabel');
const lobbyActionLabelEl = document.getElementById('lobbyActionLabel');
const lobbySupportCopyEl = document.getElementById('lobbySupportCopy');
const lobbyFlowSummaryEl = document.getElementById('lobbyFlowSummary');
const lobbyFlowStepShareEl = document.getElementById('lobbyFlowStepShare');
const lobbyFlowStepJoinEl = document.getElementById('lobbyFlowStepJoin');
const lobbyFlowStepReadyEl = document.getElementById('lobbyFlowStepReady');
const gameStageEl = document.getElementById('gameStage');
const boardEl = document.getElementById('board');
const boardFxLayerEl = document.getElementById('boardFxLayer');
const countdownOverlayEl = document.getElementById('countdownOverlay');
const gamePhaseLabel = document.getElementById('gamePhaseLabel');
const gameStatusInlineEl = document.getElementById('gameStatusInline');
const countdownLabel = document.getElementById('countdownLabel');
const speedLabel = document.getElementById('speedLabel');
const score0El = document.getElementById('score0');
const score1El = document.getElementById('score1');
const scoreCard0El = document.getElementById('scoreCard0');
const scoreCard1El = document.getElementById('scoreCard1');
const playerState0El = document.getElementById('playerState0');
const scoreLabel0El = document.getElementById('scoreLabel0');
const playerState1El = document.getElementById('playerState1');
const scoreLabel1El = document.getElementById('scoreLabel1');
const gameMessageEl = document.getElementById('gameMessage');
const buildMarkerEl = document.getElementById('buildMarker');
const gameBuildMarkerEl = document.getElementById('gameBuildMarker');
const rematchPanelEl = document.getElementById('rematchPanel');
const rematchStatusEl = document.getElementById('rematchStatus');
const rematchButton = document.getElementById('rematchButton');
const postGameBannerEl = document.getElementById('postGameBanner');
const postGameBannerTitleEl = document.getElementById('postGameBannerTitle');
const postGameBannerStatusEl = document.getElementById('postGameBannerStatus');
const postGameBannerButton = document.getElementById('postGameBannerButton');
const soundToggleButton = document.getElementById('soundToggleButton');
const touchControlsEl = document.getElementById('touchControls');
const touchControlButtons = Array.from(document.querySelectorAll('[data-direction]'));

let latestLobbyState = null;
let latestGameState = null;
let latestRematchState = null;
let latestCountdownState = null;
let lastCountdownFxKey = null;
let yourSlotIndex = null;
let boardReady = false;
let buildMarkerText = 'Build: loading…';
let buildMarkerTitle = 'Build metadata is loading.';
let pendingDirection = null;
let latestSession = null;
const PLAYER_NAME_STORAGE_KEY = 'snake:player-name';

const viewportState = {
  layoutMode: 'desktop',
  orientation: 'landscape',
  touchPreferred: window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0,
};

const swipeState = {
  active: false,
  pointerId: null,
  startX: 0,
  startY: 0,
  startAt: 0,
};

const SWIPE_MIN_DISTANCE_PX = 24;
const SWIPE_AXIS_DOMINANCE_PX = 6;

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const MOTION_REDUCED = () => prefersReducedMotion.matches;

const uiState = {
  screen: 'entry',
  phaseTheme: 'entry',
  outcomeTheme: 'neutral',
};

const audioManager = createAudioManager();
audioManager.initFromStorage();
loadBuildMarker();
setupAudioUnlock();
setupTouchControls();
updateViewportState();
window.addEventListener('resize', updateViewportState);
window.addEventListener('orientationchange', updateViewportState);
renderAudioToggle();

socket.on('connect', () => {
  const resumed = tryResumeStoredSession();
  statusEl.textContent = resumed ? 'Connected. Trying to resume your room…' : 'Connected. Create a room or join with a code.';
  if (!resumed) {
    applyPhaseTheme('entry', 'neutral');
    showScreen('entry');
  }
});

socket.on('room:error', (payload) => {
  errorEl.textContent = payload.message;
  errorEl.classList.remove('hidden');
});

socket.on('room:created', (payload) => {
  yourSlotIndex = payload.yourSlotIndex;
  errorEl.classList.add('hidden');
  statusEl.textContent = 'Room created.';
  audioManager.play('ui.click');
});

socket.on('room:joined', (payload) => {
  yourSlotIndex = payload.yourSlotIndex;
  errorEl.classList.add('hidden');
  statusEl.textContent = 'Joined room.';
  audioManager.play('ui.click');
});

socket.on('session:issued', (payload) => {
  latestSession = payload;
  storeSession(payload);
});

socket.on('session:resume:succeeded', (payload) => {
  statusEl.textContent = 'Session restored.';
  gameStatusInlineEl.textContent = payload.phase === 'in-progress' ? 'Reconnected. Waiting for server resume…' : 'Reconnected.';
});

socket.on('session:resume:failed', (payload) => {
  clearStoredSession(payload.roomCode);
  latestSession = null;
  statusEl.textContent = 'Reconnect window expired. You can create or join a room again.';
  gameStatusInlineEl.textContent = statusEl.textContent;
  applyPhaseTheme('entry', 'neutral');
  showScreen('entry');
});

socket.on('player:left', () => {
  statusEl.textContent = 'A player left. Waiting for a replacement.';
  gameStatusInlineEl.textContent = 'A player left. Waiting for a replacement.';
  rematchStatusEl.textContent = 'Rematch cleared. Waiting for a replacement player.';
});

socket.on('lobby:state', (payload) => {
  const previousLobbyState = latestLobbyState;
  latestLobbyState = payload;
  if (payload.yourSlotIndex !== undefined) {
    yourSlotIndex = payload.yourSlotIndex;
  }
  renderLobby(payload, previousLobbyState);
  applyLobbyEffects(previousLobbyState, payload);
});

socket.on('game:countdown', (payload) => {
  const previousCountdown = latestCountdownState;
  latestCountdownState = payload;
  statusEl.textContent = `Match starts in ${payload.secondsRemaining}...`;
  gameStatusInlineEl.textContent = `Match starts in ${payload.secondsRemaining}...`;
  if (uiState.screen !== 'lobby') {
    applyPhaseTheme('countdown', 'neutral');
    showScreen('gameplay');
  }
  triggerCountdownStep(payload.secondsRemaining);
});

socket.on('game:start', (payload) => {
  statusEl.textContent = `Game started in room ${payload.roomCode}.`;
  gamePhaseLabel.textContent = 'In progress';
  gameStatusInlineEl.textContent = 'Game live.';
  countdownLabel.textContent = 'Countdown: GO';
  speedLabel.textContent = `Speed: ${payload.tickIntervalMs}ms`;
  gameMessageEl.textContent = 'Gameplay screen active. Opening speed stays familiar while fairness tuning handles the first scramble.';
  triggerCountdownStep(0);
  applyPhaseTheme('live', 'neutral');
  showScreen('gameplay');
});

socket.on('game:state', (payload) => {
  const previousGameState = latestGameState;
  latestGameState = payload;
  pendingDirection = null;
  latestRematchState = { roomCode: payload.roomCode, phase: payload.phase, rematch: payload.rematch, version: payload.version };
  renderGame(payload);
  applyGameTransitionEffects(previousGameState, payload);
  renderRematch(payload.rematch, payload.phase);
});

socket.on('game:ended', (payload) => {
  const previousGameState = latestGameState;
  latestGameState = payload.finalState;
  pendingDirection = null;
  latestRematchState = { roomCode: payload.roomCode, phase: payload.phase, rematch: payload.finalState.rematch, version: payload.version };
  renderGame(payload.finalState, payload.result.bySlot);
  renderRematch(payload.finalState.rematch, payload.phase);
  applyGameTransitionEffects(previousGameState, payload.finalState, payload.result.bySlot);
  const yourOutcome = getYourOutcome(payload.result.bySlot);
  const statusText = yourOutcome === 'win' ? 'You win!' : yourOutcome === 'lose' ? 'You lose.' : 'Round ended in a draw.';
  statusEl.textContent = statusText;
  gameStatusInlineEl.textContent = statusText;
});

socket.on('game:rematch-state', (payload) => {
  const previousRematch = latestRematchState;
  latestRematchState = payload;
  renderRematch(payload.rematch, payload.phase, payload.message);
  applyRematchEffects(previousRematch, payload);
});

socket.on('room:closed', (payload) => {
  latestGameState = null;
  pendingDirection = null;
  latestLobbyState = null;
  latestRematchState = null;
  latestCountdownState = null;
  boardEl.innerHTML = '';
  boardReady = false;
  roomCodeDisplay.textContent = '----';
  gameRoomCodeEl.textContent = '----';
  phaseBadge.textContent = 'Closed';
  clearCountdownOverlay();
  applyPhaseTheme('entry', 'neutral');
  showScreen('entry');
  statusEl.textContent = payload.reason === 'player-disconnected'
    ? 'Room closed because a player disconnected. Create or join a new room to play again.'
    : 'Room closed. Create or join a new room to play again.';
});

document.getElementById('createRoomButton').addEventListener('click', () => {
  const name = getValidPlayerNameOrShowError();
  if (!name) return;
  audioManager.play('ui.click');
  persistPlayerName(name);
  socket.emit('room:create', { name });
});

document.getElementById('joinRoomButton').addEventListener('click', () => {
  const name = getValidPlayerNameOrShowError();
  if (!name) return;
  audioManager.play('ui.click');
  persistPlayerName(name);
  socket.emit('room:join', { roomCode: roomCodeInput.value, name });
});

function sessionStorageKey(roomCode) {
  return `snake:session:${String(roomCode || '').toUpperCase()}`;
}

function storeSession(payload) {
  if (!payload?.roomCode || !payload?.reconnectToken) return;
  const record = {
    roomCode: payload.roomCode,
    reconnectToken: payload.reconnectToken,
    slotIndex: payload.slotIndex,
    issuedAt: payload.issuedAt,
    version: payload.version,
  };
  localStorage.setItem(sessionStorageKey(payload.roomCode), JSON.stringify(record));
}

function clearStoredSession(roomCode) {
  if (!roomCode) return;
  localStorage.removeItem(sessionStorageKey(roomCode));
}

function getStoredSession() {
  const roomCode = latestLobbyState?.roomCode || latestGameState?.roomCode || latestSession?.roomCode;
  if (roomCode) {
    const raw = localStorage.getItem(sessionStorageKey(roomCode));
    if (raw) {
      try { return JSON.parse(raw); } catch { return null; }
    }
  }

  const key = Object.keys(localStorage).find((entry) => entry.startsWith('snake:session:'));
  if (!key) return null;
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}

function tryResumeStoredSession() {
  const stored = getStoredSession();
  if (!stored?.roomCode || !stored?.reconnectToken) return false;
  latestSession = stored;
  socket.emit('session:resume', { roomCode: stored.roomCode, reconnectToken: stored.reconnectToken });
  return true;
}

function describeReconnect(state) {
  const reconnect = state?.reconnect;
  if (!reconnect?.active) return '';
  const label = reconnect.disconnectedPlayerDisplayName || reconnect.disconnectedPlayerName || (reconnect.disconnectedSlotIndex === null || reconnect.disconnectedSlotIndex === undefined
    ? 'Player'
    : `Player ${reconnect.disconnectedSlotIndex + 1}`);
  const seconds = reconnect.secondsRemaining ?? 0;
  if (reconnect.status === 'resume-countdown') return `${label} reconnected. Resuming in ${seconds}s.`;
  return reconnect.yourSlotReserved
    ? `Rejoining your reserved slot. ${seconds}s remaining.`
    : `${label} disconnected. Slot reserved for ${seconds}s.`;
}

function focusWithoutScroll(element) {
  if (!element || typeof element.focus !== 'function') {
    return;
  }

  try {
    element.focus({ preventScroll: true });
  } catch {
    element.focus();
  }
}

function copyTextWithExecCommand(text) {
  if (!document.body || typeof document.execCommand !== 'function') {
    return false;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.setAttribute('aria-hidden', 'true');
  textarea.style.position = 'fixed';
  textarea.style.top = '0';
  textarea.style.left = '-9999px';
  textarea.style.opacity = '0';

  const selection = document.getSelection();
  const originalRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
  const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;

  document.body.appendChild(textarea);
  focusWithoutScroll(textarea);
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  } finally {
    textarea.remove();
    if (selection) {
      selection.removeAllRanges();
      if (originalRange) {
        selection.addRange(originalRange);
      }
    }
    focusWithoutScroll(activeElement);
  }

  return copied;
}

async function writeTextToClipboard(text) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the legacy copy path below. Some browsers expose the API
      // but block it in embedded/insecure contexts or without the right permission.
    }
  }

  return copyTextWithExecCommand(text);
}

function setCopyFeedback(message) {
  statusEl.textContent = message;
  if (!gamePanelEl.classList.contains('hidden')) {
    gameStatusInlineEl.textContent = message;
  }
}

async function copyActiveRoomCode() {
  const roomCode = latestLobbyState?.roomCode || latestGameState?.roomCode;
  if (!roomCode) return;

  const copied = await writeTextToClipboard(roomCode);
  if (copied) {
    setCopyFeedback('Room code copied.');
    audioManager.play('ui.copy');
    pulseConfirmation(soundToggleButton, false);
    return;
  }

  setCopyFeedback('Could not copy automatically. Select the room code and copy it manually.');
}

document.getElementById('copyRoomCodeButton').addEventListener('click', copyActiveRoomCode);
if (lobbyHelpButton && lobbyHelpDialogEl) {
  lobbyHelpButton.addEventListener('click', () => {
    if (typeof lobbyHelpDialogEl.showModal === 'function') {
      lobbyHelpDialogEl.showModal();
    } else {
      lobbyHelpDialogEl.setAttribute('open', 'open');
    }
  });

  lobbyHelpDialogEl.addEventListener('click', (event) => {
    if (event.target === lobbyHelpDialogEl) {
      lobbyHelpDialogEl.close?.('dismiss');
      if (lobbyHelpDialogEl.hasAttribute('open')) lobbyHelpDialogEl.removeAttribute('open');
    }
  });

  lobbyHelpDialogEl.addEventListener('close', () => {
    lobbyHelpButton.focus();
  });
}
document.getElementById('copyGameRoomCodeButton').addEventListener('click', copyActiveRoomCode);

function requestRematch() {
  if (!latestRematchState?.rematch?.available || latestRematchState.rematch.requestedByYou) return;
  audioManager.play('ui.click');
  socket.emit('game:rematch-request');
}

rematchButton.addEventListener('click', requestRematch);
postGameBannerButton.addEventListener('click', requestRematch);

readyButton.addEventListener('click', () => {
  if (!latestLobbyState) return;
  const you = latestLobbyState.players.find((player) => player.isYou);
  if (!you) return;
  audioManager.play('ui.click');
  socket.emit('player:ready:set', { ready: !you.isReady });
});

soundToggleButton.addEventListener('click', async () => {
  await audioManager.unlock();
  audioManager.setEnabled(!audioManager.enabled);
  renderAudioToggle();
  pulseConfirmation(soundToggleButton);
});

document.addEventListener('keydown', (event) => {
  const direction = keyToDirection(event.key);
  if (!direction) return;
  requestDirection(direction, 'keyboard');
});

async function loadBuildMarker() {
  try {
    const response = await fetch(`/build-info.json?ts=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Build info request failed with ${response.status}`);
    }

    const buildInfo = await response.json();
    buildMarkerText = `Build: ${buildInfo.displayVersion}`;
    buildMarkerTitle = `Version ${buildInfo.version} • Commit ${buildInfo.commit} • Built ${buildInfo.builtAt}`;
  } catch (error) {
    console.error(error);
    buildMarkerText = 'Build: unavailable';
    buildMarkerTitle = 'Build metadata could not be loaded.';
  }

  syncBuildMarkers();
}

function syncBuildMarkers() {
  buildMarkerEl.textContent = buildMarkerText;
  buildMarkerEl.title = buildMarkerTitle;
  gameBuildMarkerEl.textContent = buildMarkerText;
  gameBuildMarkerEl.title = buildMarkerTitle;
}

hydrateStoredPlayerName();

function normalizePlayerName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function validatePlayerName(value) {
  const normalized = normalizePlayerName(value);
  if (!normalized) return { valid: false, message: 'Enter a name up to 12 characters without emoji.' };
  if (normalized.length > 12) return { valid: false, message: 'Enter a name up to 12 characters without emoji.' };
  if (/(?:\p{Extended_Pictographic}|\p{Emoji_Presentation})/u.test(normalized)) return { valid: false, message: 'Enter a name up to 12 characters without emoji.' };
  return { valid: true, normalized };
}

function hydrateStoredPlayerName() {
  const stored = window.localStorage.getItem(PLAYER_NAME_STORAGE_KEY);
  if (!stored) return;
  const result = validatePlayerName(stored);
  if (result.valid) playerNameInput.value = result.normalized;
  else window.localStorage.removeItem(PLAYER_NAME_STORAGE_KEY);
}

function persistPlayerName(name) {
  window.localStorage.setItem(PLAYER_NAME_STORAGE_KEY, name);
  playerNameInput.value = name;
}

function setNameHelp(message, isError = false) {
  nameHelpEl.textContent = message;
  nameHelpEl.style.color = isError ? 'var(--accent-danger)' : '';
}

function getValidPlayerNameOrShowError() {
  const result = validatePlayerName(playerNameInput.value);
  if (!result.valid) {
    errorEl.textContent = result.message;
    errorEl.classList.remove('hidden');
    setNameHelp(result.message, true);
    playerNameInput.focus();
    return null;
  }
  errorEl.classList.add('hidden');
  setNameHelp('Enter a name up to 12 characters. Spaces are fine; emoji are not.');
  return result.normalized;
}

playerNameInput.addEventListener('input', () => {
  const result = validatePlayerName(playerNameInput.value);
  setNameHelp(result.valid ? `Ready as ${result.normalized}.` : 'Enter a name up to 12 characters. Spaces are fine; emoji are not.', !result.valid && playerNameInput.value.length > 0);
});

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}

function getLobbyPlayerStatus(player) {
  if (!player.isOccupied) {
    return { meta: 'Open slot', badge: 'Waiting', tone: 'waiting' };
  }
  if (player.isReserved) {
    return { meta: 'Reconnect hold', badge: 'Reserved', tone: 'reserved' };
  }
  if (!player.isConnected) {
    return { meta: 'Offline', badge: 'Offline', tone: 'reserved' };
  }
  if (player.isReady) {
    return { meta: 'Locked in', badge: 'Ready', tone: 'ready' };
  }
  return { meta: 'Needs ready', badge: 'Not ready', tone: 'joined' };
}

function deriveLobbyPresentation(state) {
  const reconnectMessage = describeReconnect(state);
  const you = state.players.find((player) => player.isYou);
  const opponent = state.players.find((player) => !player.isYou);
  const gameplayFocused = state.phase === 'in-progress' || state.phase === 'game-over';

  const presentation = {
    gameplayFocused,
    heroTitle: 'Mission Control',
    heroSubtitle: 'Room code first. Players second. Match starts automatically when both players are ready.',
    posterCallout: 'Mission Control',
    roomCodeHint: 'Share this room code with the second player to fill the room.',
    statusSummary: formatPhaseLabel(state.phase),
    nextStepLabel: 'Share the room code to fill the second slot.',
    supportCopy: 'The match starts automatically once both players are connected and ready.',
    statusMessage: reconnectMessage || '',
    readyButtonLabel: you?.isReady ? 'Unready' : "I'm ready",
    readyButtonDisabled: !you || !you.isOccupied || gameplayFocused,
    readyButtonWaiting: !!state.allPlayersPresent && !state.allReady,
    flowSummary: 'Step 1 of 3 · Share the room code',
    flowSteps: { share: 'active', join: 'pending', ready: 'pending' },
    lobbyMode: 'waiting',
    launchRingValue: 'WAITING',
    launchRingState: 'waiting',
  };

  if (state.reconnect?.active) {
    const playerName = state.reconnect.disconnectedPlayerDisplayName || state.reconnect.disconnectedPlayerName || 'A player';
    presentation.heroTitle = 'Reconnect hold';
    presentation.heroSubtitle = state.reconnect.yourSlotReserved
      ? 'Your slot is still reserved. Rejoin before the reconnect timer expires.'
      : 'One player is offline. The slot stays reserved during the reconnect window.';
    presentation.posterCallout = 'Reconnect';
    presentation.roomCodeHint = 'Keep the room code handy while the reconnect window is active.';
    presentation.statusSummary = 'Reserved slot active';
    presentation.launchRingValue = `${state.reconnect.secondsRemaining ?? 0}s`;
    presentation.launchRingState = 'reconnect';
    presentation.nextStepLabel = state.reconnect.yourSlotReserved
      ? `Reconnect within ${state.reconnect.secondsRemaining ?? 0}s to keep your slot.`
      : `Waiting for ${playerName} to reconnect.`;
    presentation.supportCopy = reconnectMessage || 'When the player reconnects, both players can confirm ready again.';
    presentation.flowSummary = 'Reconnect window active';
    presentation.flowSteps = { share: 'complete', join: 'active', ready: 'blocked' };
    presentation.lobbyMode = 'reconnect';
    return presentation;
  }

  if (!state.allPlayersPresent) {
    presentation.heroTitle = 'Mission Control';
    presentation.heroSubtitle = 'Created room. Share the code, fill the second slot, then ready up.';
    presentation.posterCallout = 'Waiting for opponent';
    presentation.statusSummary = '1 of 2 players present';
    presentation.nextStepLabel = 'Share the code to invite the second player.';
    presentation.supportCopy = 'Once both players are here, each person presses ready and the 3-second countdown starts automatically.';
    presentation.flowSummary = 'Step 1 of 3 · Share the room code';
    presentation.flowSteps = { share: 'active', join: 'pending', ready: 'pending' };
    presentation.lobbyMode = 'waiting';
    return presentation;
  }

  if (state.phase === 'starting') {
    presentation.heroTitle = 'Match starting';
    presentation.heroSubtitle = 'Both players are locked in. Countdown is handing off to gameplay.';
    presentation.posterCallout = 'Countdown';
    presentation.roomCodeHint = 'Room is full. Countdown is in progress.';
    presentation.statusSummary = 'Starting now';
    presentation.launchRingValue = String(state.countdown?.secondsRemaining || 3);
    presentation.launchRingState = 'starting';
    presentation.nextStepLabel = state.message || 'Countdown live. Gameplay begins in a moment.';
    presentation.supportCopy = 'Stay connected while the board takes over.';
    presentation.flowSummary = 'Step 3 of 3 · Countdown handoff';
    presentation.flowSteps = { share: 'complete', join: 'complete', ready: 'complete' };
    presentation.lobbyMode = 'starting';
    return presentation;
  }

  if (state.allPlayersPresent && !state.allReady) {
    presentation.heroTitle = 'Mission Control';
    presentation.heroSubtitle = 'Room is full. Player readiness is the only remaining blocker before the match starts.';
    presentation.posterCallout = 'Ready check';
    presentation.roomCodeHint = 'Room is full. Both players must be ready before the countdown starts.';
    presentation.statusSummary = 'Ready check';
    presentation.launchRingState = 'armed';
    if (you && !you.isReady) {
      presentation.launchRingValue = 'READY';
      presentation.nextStepLabel = 'Press ready when you are set to play.';
      presentation.supportCopy = 'Your opponent is here. As soon as both readiness badges turn green, the countdown begins.';
      presentation.flowSummary = 'Step 2 of 3 · Confirm both players are ready';
      presentation.flowSteps = { share: 'complete', join: 'active', ready: 'pending' };
    } else {
      presentation.launchRingValue = 'STAND BY';
      presentation.nextStepLabel = `${opponent?.displayName || 'Your opponent'} still needs to ready up.`;
      presentation.supportCopy = 'You are ready. The lobby will move straight into the countdown once the other player confirms.';
      presentation.flowSummary = 'Step 2 of 3 · Waiting on final ready';
      presentation.flowSteps = { share: 'complete', join: 'complete', ready: 'active' };
    }
    presentation.lobbyMode = 'ready-check';
    return presentation;
  }

  if (state.allReady) {
    presentation.heroTitle = 'Mission Control';
    presentation.heroSubtitle = 'Both players are ready. Countdown should begin automatically.';
    presentation.posterCallout = 'All systems ready';
    presentation.roomCodeHint = 'No further sharing needed. This room is fully set.';
    presentation.statusSummary = 'Both players ready';
    presentation.launchRingValue = 'READY';
    presentation.launchRingState = 'ready';
    presentation.nextStepLabel = 'Both players ready. Starting match…';
    presentation.supportCopy = 'Stay connected while the countdown takes over.';
    presentation.flowSummary = 'Step 3 of 3 · Countdown handoff';
    presentation.flowSteps = { share: 'complete', join: 'complete', ready: 'complete' };
    presentation.lobbyMode = 'ready';
  }

  return presentation;
}



function renderRoomCodeDigits(roomCode) {
  if (!roomCodeDigitsEl) return;
  const chars = String(roomCode || '----').padEnd(4, '-').slice(0, 4).split('');
  roomCodeDigitsEl.innerHTML = chars.map((character) => `<span class="room-code-digit">${escapeHtml(character)}</span>`).join('');
}

function applyLobbyFlowStep(stepEl, state) {
  if (!stepEl) return;
  stepEl.classList.remove('is-pending', 'is-active', 'is-complete', 'is-blocked');
  stepEl.classList.add(`is-${state}`);
}

function renderLobby(state) {
  roomCodeDisplay.textContent = state.roomCode;
  renderRoomCodeDigits(state.roomCode);
  gameRoomCodeEl.textContent = state.roomCode;

  const presentation = deriveLobbyPresentation(state);
  phaseBadge.textContent = formatPhaseLabel(state.phase);
  lobbyHeroTitleEl.textContent = presentation.heroTitle;
  if (lobbyHeroSubtitleEl) lobbyHeroSubtitleEl.textContent = presentation.heroSubtitle;
  lobbyPosterCalloutEl.textContent = presentation.posterCallout;
  lobbyStatusSummaryEl.textContent = presentation.statusSummary;
  if (roomCodeHintEl) roomCodeHintEl.textContent = presentation.roomCodeHint;
  lobbyLaunchRingEl.dataset.ringState = presentation.launchRingState;
  lobbyLaunchRingValueEl.textContent = presentation.launchRingValue;
  lobbyMessage.textContent = presentation.statusMessage;
  lobbyMessage.classList.toggle('hidden', !presentation.statusMessage);
  lobbyActionLabelEl.textContent = presentation.nextStepLabel;
  lobbyNextStepLabelEl.textContent = presentation.nextStepLabel;
  lobbySupportCopyEl.textContent = presentation.supportCopy;
  lobbyFlowSummaryEl.textContent = presentation.flowSummary;
  applyLobbyFlowStep(lobbyFlowStepShareEl, presentation.flowSteps.share);
  applyLobbyFlowStep(lobbyFlowStepJoinEl, presentation.flowSteps.join);
  applyLobbyFlowStep(lobbyFlowStepReadyEl, presentation.flowSteps.ready);
  lobbyEl.dataset.lobbyMode = presentation.lobbyMode;
  playersEl.innerHTML = '';

  applyPhaseTheme(presentation.gameplayFocused ? getPhaseTheme(state.phase) : 'lobby', 'neutral');
  showScreen(presentation.gameplayFocused ? 'gameplay' : 'lobby');

  for (const player of state.players) {
    const status = getLobbyPlayerStatus(player);
    const card = document.createElement('article');
    card.className = `player lobby-player-card player-tone-${status.tone} ${player.isYou ? 'you' : ''} ${player.isReady ? 'ready' : ''} ${player.isOccupied ? '' : 'waiting'}`;
    const slotLabel = player.slotIndex === 0 ? 'Player 1' : player.slotIndex === 1 ? 'Player 2' : player.label;
    card.innerHTML = `
      <div class="player-card-head">
        <div class="player-identity-stack">
          <div class="player-label-row">
            <span class="eyebrow">${escapeHtml(slotLabel)}</span>
            ${player.isYou ? '<span class="player-you-tag">You</span>' : ''}
          </div>
          <strong>${escapeHtml(player.displayName)}</strong>
          <span class="player-corner-note">${escapeHtml(player.label)}</span>
        </div>
        <span class="player-chip player-status-badge player-status-${status.tone}">${escapeHtml(status.badge)}</span>
      </div>
      <div class="player-meta">
        <span>${escapeHtml(status.meta)}</span>
      </div>
    `;
    playersEl.appendChild(card);
  }

  readyButton.textContent = presentation.readyButtonLabel;
  readyButton.disabled = presentation.readyButtonDisabled;
  readyButton.classList.toggle('is-waiting', presentation.readyButtonWaiting);

  if (presentation.gameplayFocused) {
    gamePhaseLabel.textContent = state.phase === 'starting' ? 'Countdown' : state.phase === 'game-over' ? 'Game over' : 'In progress';
    gameStatusInlineEl.textContent = describeReconnect(state) || (state.phase === 'starting'
      ? 'Match starts in moments.'
      : state.phase === 'game-over'
        ? 'Round complete.'
        : 'Game live.');
    gameMessageEl.textContent = describeReconnect(state) || (state.phase === 'starting'
      ? 'Both players are ready. Transitioning into gameplay.'
      : state.phase === 'game-over'
        ? 'Round finished. Choose rematch or wait for room changes.'
        : 'Gameplay screen active. Lobby is fully hidden during the match.');
  }

  renderRematch(state.rematch, state.phase);
}

function renderRematch(rematch, phase, message) {
  const isPostGame = phase === 'game-over';
  rematchPanelEl.classList.toggle('hidden', !isPostGame);
  postGameBannerEl.classList.toggle('hidden', !isPostGame);
  rematchPanelEl.classList.remove('highlighted');
  rematchButton.classList.remove('is-waiting');
  postGameBannerButton.classList.remove('waiting', 'accepted');
  if (!isPostGame) return;

  const players = latestGameState?.players || latestLobbyState?.players || latestRematchState?.players || [];
  const opponent = players.find((player) => player.slotIndex !== yourSlotIndex);
  let statusText = message || 'Want another round? Rematch is ready as soon as both players accept.';
  let buttonText = 'Accept rematch';
  let buttonDisabled = true;
  let bannerTitle = 'Rematch ready';

  if (!rematch?.available) {
    statusText = message || 'Rematch unavailable until both players are present.';
    buttonText = 'Rematch unavailable';
    bannerTitle = 'Waiting for both players';
  } else if (rematch.bothAccepted) {
    statusText = 'Both players accepted. Fresh round loading now…';
    buttonText = 'Rematch starting…';
    bannerTitle = 'Countdown loading';
    postGameBannerButton.classList.add('accepted');
  } else if (rematch.waitingForOtherPlayer) {
    statusText = 'Rematch requested. Waiting on the other player now.';
    buttonText = 'Waiting for other player';
    buttonDisabled = true;
    bannerTitle = 'Request sent';
    rematchPanelEl.classList.add('highlighted');
    rematchButton.classList.add('is-waiting');
    postGameBannerButton.classList.add('waiting');
  } else if (rematch.requestedBySlot[0] || rematch.requestedBySlot[1]) {
    statusText = `${opponent?.displayName || 'Your opponent'} wants a rematch. Accept to restart in the same room.`;
    buttonText = 'Accept rematch now';
    buttonDisabled = false;
    bannerTitle = 'Opponent wants another round';
    rematchPanelEl.classList.add('highlighted');
  } else {
    statusText = message || 'Want another round? Rematch is ready as soon as both players accept.';
    buttonText = 'Accept rematch now';
    buttonDisabled = false;
    bannerTitle = 'Play again';
    rematchPanelEl.classList.add('highlighted');
  }

  if (rematch?.requestedByYou) {
    buttonText = 'Rematch requested';
    buttonDisabled = true;
    bannerTitle = 'Waiting on your opponent';
    postGameBannerButton.classList.add('waiting');
  }

  rematchStatusEl.textContent = statusText;
  postGameBannerTitleEl.textContent = bannerTitle;
  postGameBannerStatusEl.textContent = statusText;
  rematchButton.textContent = buttonText;
  postGameBannerButton.textContent = buttonText;
  rematchButton.disabled = buttonDisabled;
  postGameBannerButton.disabled = buttonDisabled;
}

function renderGame(state, perSlotResult) {
  const gameplayVisible = state.phase === 'in-progress' || state.phase === 'game-over';
  if (gameplayVisible) {
    showScreen('gameplay');
  }
  gameRoomCodeEl.textContent = state.roomCode;
  ensureBoard(state.board.width, state.board.height);
  score0El.textContent = String(state.snakes[0].score);
  scoreLabel0El.textContent = `${state.players[0].displayName} · ${state.players[0].label}`;
  score1El.textContent = String(state.snakes[1].score);
  scoreLabel1El.textContent = `${state.players[1].displayName} · ${state.players[1].label}`;
  speedLabel.textContent = `Speed: ${state.tickIntervalMs}ms`;

  updateScoreCards(state, perSlotResult);

  if (state.phase === 'starting') {
    gamePhaseLabel.textContent = 'Countdown';
    gameStatusInlineEl.textContent = 'Match starts in moments. Queue your opener now.';
    countdownLabel.textContent = `Countdown: ${state.countdownSecondsRemaining ?? 3}`;
    gameMessageEl.textContent = 'Queue your opening turn now. Opening food is filtered for a fairer race.';
    applyPhaseTheme('countdown', 'neutral');
  } else if (state.phase === 'in-progress') {
    gamePhaseLabel.textContent = 'In progress';
    gameStatusInlineEl.textContent = describeReconnect(state) || 'Game live.';
    countdownLabel.textContent = `Tick: ${state.tickNumber}`;
    gameMessageEl.textContent = describeReconnect(state) || 'Avoid walls, avoid bodies, and race for the shared food.';
    applyPhaseTheme('live', 'neutral');
  } else {
    gamePhaseLabel.textContent = 'Game over';
    countdownLabel.textContent = 'Rematch: ready now';
    const yourOutcome = getYourOutcome(perSlotResult);
    gameStatusInlineEl.textContent = yourOutcome === 'win' ? 'You win!' : yourOutcome === 'lose' ? 'You lose.' : 'Round ended in a draw.';
    gameMessageEl.textContent = yourOutcome === 'win' ? 'Result: you win. Rematch is available immediately.' : yourOutcome === 'lose' ? 'Result: you lose. Rematch is available immediately.' : 'Result: draw. Rematch is available immediately.';
    applyPhaseTheme('result', yourOutcome);
  }

  paintBoard(state);
}

function showScreen(screen) {
  const gameplayActive = screen === 'gameplay';
  const screenChanged = uiState.screen !== screen;
  uiState.screen = screen;
  entryEl.classList.toggle('hidden', screen !== 'entry');
  lobbyEl.classList.toggle('hidden', screen !== 'lobby');
  gamePanelEl.classList.toggle('hidden', !gameplayActive);
  panelEl.classList.toggle('gameplay-active', gameplayActive);
  panelEl.classList.toggle('lobby-active', screen === 'lobby');
  panelTopEl.classList.toggle('hidden', gameplayActive);
  statusEl.classList.toggle('hidden', gameplayActive);
  errorEl.classList.toggle('hidden', gameplayActive || !errorEl.textContent);

  if (gameplayActive && screenChanged) {
    panelEl.scrollTop = 0;
    gamePanelEl.scrollTop = 0;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }

  syncResponsiveUi();
}

function applyPhaseTheme(phaseTheme, outcomeTheme) {
  panelEl.classList.remove('phase-entry', 'phase-lobby', 'phase-countdown', 'phase-live', 'phase-result');
  panelEl.classList.add(`phase-${phaseTheme}`);
  panelEl.dataset.phase = phaseTheme;
  panelEl.dataset.outcome = outcomeTheme;
  uiState.phaseTheme = phaseTheme;
  uiState.outcomeTheme = outcomeTheme;
}

function ensureBoard(width, height) {
  if (boardReady) return;
  boardEl.innerHTML = '';
  boardEl.style.gridTemplateColumns = `repeat(${width}, minmax(0, 1fr))`;
  for (let i = 0; i < width * height; i += 1) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    if (MOTION_REDUCED()) {
      cell.classList.add('reduce-motion');
    }
    boardEl.appendChild(cell);
  }
  boardReady = true;
}

function paintBoard(state) {
  const cells = Array.from(boardEl.children);
  for (const cell of cells) {
    cell.className = 'cell';
    if (MOTION_REDUCED()) cell.classList.add('reduce-motion');
  }

  paintCell(state.food.x, state.food.y, 'food', state.board.width);

  state.snakes.forEach((snake) => {
    snake.body.forEach((segment, index) => {
      paintCell(segment.x, segment.y, `snake-${snake.slotIndex}`, state.board.width);
      if (index === 0) {
        paintCell(segment.x, segment.y, 'head', state.board.width);
      }
    });
  });
}

function updateScoreCards(state, perSlotResult) {
  const scores = state.snakes.map((snake) => snake.score);
  const leadScore = Math.max(...scores);

  state.snakes.forEach((snake) => {
    const cardEl = snake.slotIndex === 0 ? scoreCard0El : scoreCard1El;
    const stateEl = snake.slotIndex === 0 ? playerState0El : playerState1El;
    cardEl.classList.toggle('is-you', snake.slotIndex === yourSlotIndex);
    cardEl.classList.toggle('is-leading', state.phase === 'in-progress' && snake.score === leadScore && leadScore > 0);
    cardEl.classList.toggle('is-eliminated', state.phase === 'game-over' && !snake.alive && (!perSlotResult || perSlotResult[snake.slotIndex] !== 'win'));

    if (state.phase === 'game-over' && perSlotResult) {
      stateEl.textContent = perSlotResult[snake.slotIndex] === 'win' ? 'Winner' : perSlotResult[snake.slotIndex] === 'lose' ? 'Eliminated' : 'Draw';
    } else if (state.phase === 'starting') {
      stateEl.textContent = 'Ready';
    } else {
      stateEl.textContent = snake.alive ? 'Alive' : 'Out';
    }
  });
}

function applyLobbyEffects(previousLobbyState, nextLobbyState) {
  if (!previousLobbyState) return;

  const previousOpponent = previousLobbyState.players.find((player) => !player.isYou);
  const nextOpponent = nextLobbyState.players.find((player) => !player.isYou);
  if (previousOpponent && nextOpponent && !previousOpponent.isOccupied && nextOpponent.isOccupied) {
    statusEl.textContent = `${nextOpponent.displayName} joined the room.`;
  }

  const youBefore = previousLobbyState.players.find((player) => player.isYou);
  const youAfter = nextLobbyState.players.find((player) => player.isYou);
  if (youBefore && youAfter && !youBefore.isReady && youAfter.isReady) {
    audioManager.play('lobby.ready-on');
    pulseConfirmation(readyButton);
  }
}

function applyGameTransitionEffects(previousGameState, nextGameState, perSlotResult = nextGameState.result?.bySlot) {
  if (!nextGameState) return;

  const nextCountdown = nextGameState.countdownSecondsRemaining;
  if (nextGameState.phase === 'starting' && nextCountdown !== undefined) {
    triggerCountdownStep(nextCountdown);
  }

  if (previousGameState) {
    nextGameState.snakes.forEach((snake) => {
      const previousSnake = previousGameState.snakes[snake.slotIndex];
      if (snake.score > previousSnake.score) {
        const card = snake.slotIndex === 0 ? scoreCard0El : scoreCard1El;
        pulseTransientClass(card.querySelector('.score-card'), 'score-pop', 420);
        audioManager.play('game.food');
      }
    });
  }

  if (previousGameState?.phase !== 'game-over' && nextGameState.phase === 'game-over') {
    const outcome = getYourOutcome(perSlotResult);
    flashBoard(outcome === 'win' ? 'flash-win' : outcome === 'draw' ? 'flash-draw' : 'flash-collision');
    audioManager.play('game.collision');
    if (outcome === 'win') {
      audioManager.play('result.win');
    } else if (outcome === 'lose') {
      audioManager.play('result.lose');
    }
    clearCountdownOverlay();
  }
}

function applyRematchEffects(previousPayload, nextPayload) {
  if (!previousPayload || !nextPayload?.rematch) return;
  const prev = previousPayload.rematch;
  const next = nextPayload.rematch;

  const opponentRequestedNow = (!prev.requestedBySlot[0] && next.requestedBySlot[0] && yourSlotIndex !== 0)
    || (!prev.requestedBySlot[1] && next.requestedBySlot[1] && yourSlotIndex !== 1);
  if (opponentRequestedNow && !next.requestedByYou) {
    audioManager.play('rematch.requested');
    pulseConfirmation(rematchPanelEl);
  }

  if (!prev.bothAccepted && next.bothAccepted) {
    audioManager.play('rematch.accepted');
  }
}

function triggerCountdownStep(nextValue) {
  if (nextValue === undefined || nextValue === null) return;
  const fxKey = `countdown:${nextValue === 0 ? 'go' : nextValue}`;
  if (lastCountdownFxKey === fxKey) return;
  lastCountdownFxKey = fxKey;

  const label = nextValue === 0 ? 'GO' : String(nextValue);
  countdownOverlayEl.textContent = label;
  countdownOverlayEl.dataset.countdownValue = label;
  countdownOverlayEl.classList.remove('hidden');
  pulseTransientClass(countdownOverlayEl, 'is-active', MOTION_REDUCED() ? 40 : 640);
  audioManager.play(nextValue === 0 ? 'countdown.go' : 'countdown.tick');
}

function clearCountdownOverlay() {
  lastCountdownFxKey = null;
  countdownOverlayEl.classList.add('hidden');
  countdownOverlayEl.classList.remove('is-active');
  countdownOverlayEl.textContent = '';
}

function flashBoard(className) {
  boardFxLayerEl.className = 'board-fx-layer';
  void boardFxLayerEl.offsetWidth;
  boardFxLayerEl.classList.add(className);
  window.setTimeout(() => {
    boardFxLayerEl.className = 'board-fx-layer';
  }, MOTION_REDUCED() ? 40 : 620);
}

function pulseTransientClass(element, className, durationMs) {
  if (!element) return;
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
  window.setTimeout(() => {
    element.classList.remove(className);
    if (element === countdownOverlayEl) {
      countdownOverlayEl.classList.add('hidden');
    }
  }, durationMs);
}

function pulseConfirmation(element, playSound = true) {
  if (!element) return;
  if (playSound) {
    audioManager.play('ui.click');
  }
  pulseTransientClass(element, 'is-confirmed', 600);
}

function paintCell(x, y, className, width) {
  const cell = boardEl.children[y * width + x];
  if (cell) cell.classList.add(className);
}

function getYourOutcome(bySlot) {
  return yourSlotIndex === null || !bySlot ? 'draw' : bySlot[yourSlotIndex];
}

function getPhaseTheme(phase) {
  if (phase === 'starting') return 'countdown';
  if (phase === 'in-progress') return 'live';
  if (phase === 'game-over') return 'result';
  return 'lobby';
}

function formatPhaseLabel(phase) {
  return phase.replace(/-/g, ' ');
}

function renderAudioToggle() {
  soundToggleButton.textContent = `Sound: ${audioManager.enabled ? 'on' : 'off'}`;
  soundToggleButton.setAttribute('aria-pressed', String(audioManager.enabled));
  soundToggleButton.classList.toggle('is-muted', !audioManager.enabled);
}

function getLayoutMode() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const portrait = window.matchMedia('(orientation: portrait)').matches;
  const shortEdge = Math.min(width, height);
  const longEdge = Math.max(width, height);
  const touchPreferred = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;

  const phoneSized = shortEdge <= 480 || (touchPreferred && shortEdge <= 540 && longEdge <= 980);
  if (phoneSized) return portrait ? 'mobile-portrait' : 'mobile-landscape';
  if (width <= 1100) return 'tablet';
  return 'desktop';
}

function updateViewportState() {
  viewportState.layoutMode = getLayoutMode();
  viewportState.orientation = window.matchMedia('(orientation: portrait)').matches ? 'portrait' : 'landscape';
  viewportState.touchPreferred = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  panelEl.dataset.layoutMode = viewportState.layoutMode;
  panelEl.dataset.orientation = viewportState.orientation;
  panelEl.dataset.touch = String(viewportState.touchPreferred);
  syncResponsiveUi();
}

function syncResponsiveUi() {
  const touchControlsVisible = shouldShowTouchControls({
    layoutMode: viewportState.layoutMode,
    touchPreferred: viewportState.touchPreferred,
    phase: latestGameState?.phase || latestLobbyState?.phase || 'entry',
    screen: uiState.screen,
  });
  touchControlsEl.classList.toggle('hidden', !touchControlsVisible);
  gameStageEl.classList.toggle('is-touch-active', touchControlsVisible);
  gamePanelEl.classList.toggle('touch-controls-visible', touchControlsVisible);

  const controlsEnabled = canRequestDirection();
  touchControlButtons.forEach((button) => {
    button.disabled = !controlsEnabled;
  });
}

function shouldShowTouchControls({ layoutMode, touchPreferred, phase, screen }) {
  if (screen !== 'gameplay') return false;
  if (!touchPreferred && !layoutMode.startsWith('mobile')) return false;
  return phase === 'starting' || phase === 'in-progress' || phase === 'game-over';
}

function setupTouchControls() {
  touchControlButtons.forEach((button) => {
    button.addEventListener('click', () => {
      requestDirection(button.dataset.direction, 'touch-button');
    });
  });

  gameStageEl.addEventListener('pointerdown', (event) => {
    if (!shouldShowTouchControls({
      layoutMode: viewportState.layoutMode,
      touchPreferred: viewportState.touchPreferred,
      phase: latestGameState?.phase || latestLobbyState?.phase || 'entry',
      screen: uiState.screen,
    }) || event.pointerType === 'mouse') {
      return;
    }

    audioManager.unlock();
    swipeState.active = true;
    swipeState.pointerId = event.pointerId;
    swipeState.startX = event.clientX;
    swipeState.startY = event.clientY;
    swipeState.startAt = Date.now();
  }, { passive: true });

  gameStageEl.addEventListener('pointerup', (event) => {
    if (!swipeState.active || swipeState.pointerId !== event.pointerId) return;
    const direction = resolveSwipeDirection(swipeState.startX, swipeState.startY, event.clientX, event.clientY);
    resetSwipeState();
    if (direction) {
      requestDirection(direction, 'swipe');
    }
  });

  gameStageEl.addEventListener('pointercancel', resetSwipeState);
  gameStageEl.addEventListener('pointerleave', (event) => {
    if (event.pointerType !== 'mouse') return;
    resetSwipeState();
  });
}

function resetSwipeState() {
  swipeState.active = false;
  swipeState.pointerId = null;
  swipeState.startX = 0;
  swipeState.startY = 0;
  swipeState.startAt = 0;
}

function resolveSwipeDirection(startX, startY, endX, endY) {
  const dx = endX - startX;
  const dy = endY - startY;
  if (Math.hypot(dx, dy) < SWIPE_MIN_DISTANCE_PX) return null;

  if (Math.abs(dx) > Math.abs(dy) + SWIPE_AXIS_DOMINANCE_PX) {
    return dx > 0 ? 'right' : 'left';
  }

  if (Math.abs(dy) > Math.abs(dx) + SWIPE_AXIS_DOMINANCE_PX) {
    return dy > 0 ? 'down' : 'up';
  }

  return Math.abs(dx) >= Math.abs(dy)
    ? (dx > 0 ? 'right' : 'left')
    : (dy > 0 ? 'down' : 'up');
}

function canRequestDirection() {
  return latestGameState && (latestGameState.phase === 'starting' || latestGameState.phase === 'in-progress');
}

function requestDirection(direction, source) {
  if (!direction || !canRequestDirection()) return;

  audioManager.unlock();

  const snake = yourSlotIndex === null ? null : latestGameState?.snakes?.[yourSlotIndex];
  const effectiveDirection = pendingDirection || snake?.pendingDirection || snake?.direction;
  if (effectiveDirection && (direction === effectiveDirection || OPPOSITE[effectiveDirection] === direction)) {
    return;
  }

  pendingDirection = direction;
  socket.emit('player:direction:set', { direction });

  if (source === 'touch-button') {
    pulseConfirmation(touchControlsEl, false);
  }
}

function setupAudioUnlock() {
  const unlock = () => audioManager.unlock();
  window.addEventListener('pointerdown', unlock, { passive: true, once: true });
  window.addEventListener('keydown', unlock, { once: true });
}

function createAudioManager() {
  const storageKey = 'snake-ui-audio-enabled';
  let audioContext = null;

  return {
    enabled: true,
    unlocked: false,
    initFromStorage() {
      const stored = window.localStorage.getItem(storageKey);
      if (stored === 'false') {
        this.enabled = false;
      }
    },
    async unlock() {
      if (this.unlocked) return;
      try {
        const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextCtor) return;
        audioContext = audioContext || new AudioContextCtor();
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }
        this.unlocked = audioContext.state === 'running';
      } catch {
        this.unlocked = false;
      }
    },
    setEnabled(enabled) {
      this.enabled = enabled;
      window.localStorage.setItem(storageKey, String(enabled));
    },
    play(eventName) {
      if (!this.enabled || !this.unlocked || !audioContext) return;
      const preset = SOUND_PRESETS[eventName];
      if (!preset) return;
      try {
        const now = audioContext.currentTime;
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.type = preset.type;
        oscillator.frequency.setValueAtTime(preset.frequency, now);
        if (preset.frequencyEnd) {
          oscillator.frequency.exponentialRampToValueAtTime(preset.frequencyEnd, now + preset.duration);
        }
        gainNode.gain.setValueAtTime(0.0001, now);
        gainNode.gain.exponentialRampToValueAtTime(preset.volume, now + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + preset.duration);
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.start(now);
        oscillator.stop(now + preset.duration);
      } catch {
        // Fail silently if browser audio blocks or audio graph errors.
      }
    },
  };
}

const SOUND_PRESETS = {
  'ui.click': { frequency: 360, frequencyEnd: 420, duration: 0.06, volume: 0.03, type: 'square' },
  'ui.copy': { frequency: 520, frequencyEnd: 640, duration: 0.08, volume: 0.04, type: 'triangle' },
  'lobby.ready-on': { frequency: 440, frequencyEnd: 660, duration: 0.12, volume: 0.04, type: 'triangle' },
  'countdown.tick': { frequency: 520, frequencyEnd: 420, duration: 0.09, volume: 0.04, type: 'square' },
  'countdown.go': { frequency: 660, frequencyEnd: 880, duration: 0.16, volume: 0.05, type: 'sawtooth' },
  'game.food': { frequency: 740, frequencyEnd: 980, duration: 0.08, volume: 0.035, type: 'triangle' },
  'game.collision': { frequency: 180, frequencyEnd: 80, duration: 0.18, volume: 0.045, type: 'sawtooth' },
  'result.win': { frequency: 660, frequencyEnd: 990, duration: 0.22, volume: 0.045, type: 'triangle' },
  'result.lose': { frequency: 220, frequencyEnd: 120, duration: 0.2, volume: 0.04, type: 'sawtooth' },
  'rematch.requested': { frequency: 500, frequencyEnd: 610, duration: 0.12, volume: 0.03, type: 'triangle' },
  'rematch.accepted': { frequency: 540, frequencyEnd: 760, duration: 0.14, volume: 0.04, type: 'triangle' },
};

function keyToDirection(key) {
  switch (key) {
    case 'ArrowUp':
    case 'w':
    case 'W':
      return 'up';
    case 'ArrowDown':
    case 's':
    case 'S':
      return 'down';
    case 'ArrowLeft':
    case 'a':
    case 'A':
      return 'left';
    case 'ArrowRight':
    case 'd':
    case 'D':
      return 'right';
    default:
      return null;
  }
}

const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };
