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
const createCoOpRoomButton = document.getElementById('createCoOpRoomButton');
const phaseBadge = document.getElementById('phaseBadge');
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
const swipeTrailEl = document.getElementById('swipeTrail');
const touchControlButtons = Array.from(document.querySelectorAll('[data-direction]'));
const mobileHudEl = document.getElementById('mobileHud');
const mobileHudScoreEl = document.getElementById('mobileHudScore');
const mobileHudPhaseEl = document.getElementById('mobileHudPhase');
const mobileHudRoomEl = document.getElementById('mobileHudRoom');

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
let roomMode = 'versus';
let soloMode = false;
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
  directionFired: false,
};

const SWIPE_MIN_DISTANCE_PX = 24;
const SWIPE_AXIS_DOMINANCE_PX = 6;
const SWIPE_MAX_DURATION_MS = 600;

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
  roomMode = payload.roomMode || 'versus';
  soloMode = roomMode === 'solo';
  errorEl.classList.add('hidden');
  statusEl.textContent = 'Room created.';
  audioManager.play('ui.click');
});

socket.on('room:joined', (payload) => {
  yourSlotIndex = payload.yourSlotIndex;
  roomMode = payload.roomMode || roomMode;
  soloMode = roomMode === 'solo';
  errorEl.classList.add('hidden');
  statusEl.textContent = 'Joined room.';
  audioManager.play('ui.click');
});

socket.on('session:issued', (payload) => {
  latestSession = payload;
  roomMode = payload.roomMode || roomMode;
  soloMode = roomMode === 'solo';
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
  exitFullscreenMode();
});

socket.on('player:left', () => {
  statusEl.textContent = 'A player left. Waiting for a replacement.';
  gameStatusInlineEl.textContent = 'A player left. Waiting for a replacement.';
  rematchStatusEl.textContent = 'Rematch cleared. Waiting for a replacement player.';
});

socket.on('lobby:state', (payload) => {
  const previousLobbyState = latestLobbyState;
  latestLobbyState = payload;
  roomMode = payload.roomMode || roomMode;
  soloMode = payload.soloMode !== undefined ? payload.soloMode : roomMode === 'solo';
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
  applyPhaseTheme('countdown', 'neutral');
  showScreen('gameplay');
  triggerCountdownStep(payload.secondsRemaining);
  syncFullscreenMode();
});

socket.on('game:start', (payload) => {
  roomMode = payload.roomMode || roomMode;
  soloMode = roomMode === 'solo';
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
  roomMode = payload.roomMode || roomMode;
  soloMode = roomMode === 'solo';
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
  let statusText;
  if (soloMode) {
    const yourScore = payload.finalState.snakes[0]?.score ?? 0;
    statusText = `Game over! You scored ${yourScore}.`;
  } else if (roomMode === 'co-op') {
    statusText = yourOutcome === 'win'
      ? 'Escape complete! Both players reached the exit.'
      : 'Co-op run failed. Try the room again.';
  } else {
    statusText = yourOutcome === 'win' ? 'You win!' : yourOutcome === 'lose' ? 'You lose.' : 'Round ended in a draw.';
  }
  statusEl.textContent = statusText;
  gameStatusInlineEl.textContent = statusText;
});

socket.on('game:rematch-state', (payload) => {
  const previousRematch = latestRematchState;
  latestRematchState = payload;
  roomMode = payload.roomMode || roomMode;
  soloMode = roomMode === 'solo';
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
  exitFullscreenMode();
  statusEl.textContent = payload.reason === 'player-disconnected'
    ? 'Room closed because a player disconnected. Create or join a new room to play again.'
    : 'Room closed. Create or join a new room to play again.';
});

document.getElementById('createRoomButton').addEventListener('click', () => {
  const name = getValidPlayerNameOrShowError();
  if (!name) return;
  audioManager.play('ui.click');
  persistPlayerName(name);
  roomMode = 'versus';
  soloMode = false;
  socket.emit('room:create', { name });
});

createCoOpRoomButton.addEventListener('click', () => {
  const name = getValidPlayerNameOrShowError();
  if (!name) return;
  audioManager.play('ui.click');
  persistPlayerName(name);
  roomMode = 'co-op';
  soloMode = false;
  socket.emit('room:create', { name, mode: 'co-op' });
});

document.getElementById('playSoloButton').addEventListener('click', () => {
  const name = getValidPlayerNameOrShowError();
  if (!name) return;
  audioManager.play('ui.click');
  persistPlayerName(name);
  soloMode = true;
  socket.emit('room:create-solo', { name });
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
    roomMode: payload.roomMode,
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
  roomMode = stored.roomMode || roomMode;
  soloMode = roomMode === 'solo';
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

function renderLobby(state) {
  roomCodeDisplay.textContent = state.roomCode;
  gameRoomCodeEl.textContent = state.roomCode;
  phaseBadge.textContent = formatPhaseLabel(state.phase);
  lobbyMessage.textContent = describeReconnect(state) || state.message || '';
  playersEl.innerHTML = '';

  const gameplayFocused = state.phase === 'starting' || state.phase === 'in-progress' || state.phase === 'game-over';
  applyPhaseTheme(gameplayFocused ? getPhaseTheme(state.phase) : 'lobby', 'neutral');
  showScreen(gameplayFocused ? 'gameplay' : 'lobby');

  for (const player of state.players) {
    const card = document.createElement('div');
    card.className = `player ${player.isYou ? 'you' : ''} ${player.isReady ? 'ready' : ''} ${player.isOccupied ? '' : 'waiting'}`;
    card.innerHTML = `
      <div class="player-meta">
        <strong>${player.displayName}${player.isYou ? ' (You)' : ''}</strong>
        <span>${player.label} · ${player.isOccupied ? (player.isReserved ? 'Reserved' : player.isConnected ? 'Joined' : 'Disconnected') : 'Waiting'}</span>
      </div>
      <div class="player-state">${player.isOccupied ? (player.isReserved ? 'Reconnect window active' : player.isConnected ? (player.isReady ? 'Ready to launch' : 'Not ready yet') : 'Temporarily offline') : 'Open slot'}</div>
    `;
    playersEl.appendChild(card);
  }

  const you = state.players.find((player) => player.isYou);
  readyButton.textContent = you?.isReady ? 'Unready' : 'Ready up';
  readyButton.disabled = !you || !you.isOccupied || gameplayFocused;
  readyButton.classList.toggle('is-waiting', !!state.allPlayersPresent && !state.allReady);

  if (gameplayFocused) {
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

  if (soloMode) {
    const statusText = message || 'Try again? Hit play to restart.';
    const buttonText = rematch?.requestedByYou ? 'Restarting…' : 'Play Again';
    const buttonDisabled = rematch?.requestedByYou || !rematch?.available;
    rematchStatusEl.textContent = statusText;
    postGameBannerTitleEl.textContent = 'Play again';
    postGameBannerStatusEl.textContent = statusText;
    rematchButton.textContent = buttonText;
    postGameBannerButton.textContent = buttonText;
    rematchButton.disabled = buttonDisabled;
    postGameBannerButton.disabled = buttonDisabled;
    if (rematch?.available && !rematch?.requestedByYou) {
      rematchPanelEl.classList.add('highlighted');
    }
    if (rematch?.requestedByYou) {
      postGameBannerButton.classList.add('accepted');
    }
    return;
  }

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
  showScreen('gameplay');
  gameRoomCodeEl.textContent = state.roomCode;
  ensureBoard(state.board.width, state.board.height);
  score0El.textContent = state.roomMode === 'co-op' ? (state.coOp?.playersAtExit?.[0] ? 'EXIT' : 'RUN') : String(state.snakes[0].score);
  scoreLabel0El.textContent = `${state.players[0].displayName} · ${state.players[0].label}`;

  if (soloMode) {
    scoreCard1El.classList.add('hidden');
    score1El.textContent = '—';
    scoreLabel1El.textContent = 'Solo mode';
  } else {
    scoreCard1El.classList.remove('hidden');
    score1El.textContent = state.roomMode === 'co-op' ? (state.coOp?.playersAtExit?.[1] ? 'EXIT' : 'RUN') : String(state.snakes[1].score);
    scoreLabel1El.textContent = `${state.players[1].displayName} · ${state.players[1].label}`;
  }

  speedLabel.textContent = `Speed: ${state.tickIntervalMs}ms`;

  updateScoreCards(state, perSlotResult);

  if (state.phase === 'starting') {
    gamePhaseLabel.textContent = 'Countdown';
    gameStatusInlineEl.textContent = state.roomMode === 'co-op' ? 'Co-op room loading. Plan your routes to the exit.' : 'Match starts in moments. Queue your opener now.';
    countdownLabel.textContent = `Countdown: ${state.countdownSecondsRemaining ?? 3}`;
    gameMessageEl.textContent = state.roomMode === 'co-op'
      ? 'Reach the glowing exit together. Walls are lethal, and a player who reaches the exit waits there for their teammate.'
      : 'Queue your opening turn now. Opening food is filtered for a fairer race.';
    applyPhaseTheme('countdown', 'neutral');
  } else if (state.phase === 'in-progress') {
    gamePhaseLabel.textContent = 'In progress';
    gameStatusInlineEl.textContent = describeReconnect(state) || 'Game live.';
    countdownLabel.textContent = `Tick: ${state.tickNumber}`;
    gameMessageEl.textContent = describeReconnect(state) || (state.roomMode === 'co-op'
      ? describeCoOpProgress(state)
      : 'Avoid walls, avoid bodies, and race for the shared food.');
    applyPhaseTheme('live', 'neutral');
  } else {
    gamePhaseLabel.textContent = 'Game over';
    countdownLabel.textContent = 'Rematch: ready now';
    const yourOutcome = getYourOutcome(perSlotResult);
    if (soloMode) {
      const yourScore = state.snakes[0]?.score ?? 0;
      gameStatusInlineEl.textContent = `Game over! You scored ${yourScore}.`;
      gameMessageEl.textContent = `You scored ${yourScore}. Press rematch to try again.`;
      applyPhaseTheme('result', yourOutcome === 'win' ? 'win' : 'lose');
    } else if (state.roomMode === 'co-op') {
      gameStatusInlineEl.textContent = yourOutcome === 'win' ? 'Escape complete!' : 'Co-op run failed.';
      gameMessageEl.textContent = yourOutcome === 'win'
        ? 'Both players reached the exit. Rematch is ready immediately.'
        : 'A snake went down before the team escaped. Rematch is ready immediately.';
      applyPhaseTheme('result', yourOutcome === 'win' ? 'win' : 'lose');
    } else {
      gameStatusInlineEl.textContent = yourOutcome === 'win' ? 'You win!' : yourOutcome === 'lose' ? 'You lose.' : 'Round ended in a draw.';
      gameMessageEl.textContent = yourOutcome === 'win' ? 'Result: you win. Rematch is available immediately.' : yourOutcome === 'lose' ? 'Result: you lose. Rematch is available immediately.' : 'Result: draw. Rematch is available immediately.';
      applyPhaseTheme('result', yourOutcome);
    }
  }

  paintBoard(state);
  updateMobileHud();
}

function showScreen(screen) {
  const gameplayActive = screen === 'gameplay';
  const screenChanged = uiState.screen !== screen;
  uiState.screen = screen;
  entryEl.classList.toggle('hidden', screen !== 'entry');
  lobbyEl.classList.toggle('hidden', screen !== 'lobby');
  gamePanelEl.classList.toggle('hidden', !gameplayActive);
  panelEl.classList.toggle('gameplay-active', gameplayActive);
  panelTopEl.classList.toggle('hidden', gameplayActive);
  statusEl.classList.toggle('hidden', gameplayActive);
  errorEl.classList.toggle('hidden', gameplayActive || !errorEl.textContent);

  if (gameplayActive && screenChanged) {
    panelEl.scrollTop = 0;
    gamePanelEl.scrollTop = 0;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }

  syncResponsiveUi();
  syncFullscreenMode();
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

  if (state.coOp) {
    state.coOp.walls.forEach((wall) => paintCell(wall.x, wall.y, 'wall', state.board.width));
    paintCell(state.coOp.exit.x, state.coOp.exit.y, 'exit', state.board.width);
    if (state.coOp.playersAtExit[0] || state.coOp.playersAtExit[1]) {
      paintCell(state.coOp.exit.x, state.coOp.exit.y, 'exit-ready', state.board.width);
    }
  }

  if (state.food) {
    paintCell(state.food.x, state.food.y, 'food', state.board.width);
  }

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

    if (state.roomMode === 'co-op') {
      if (state.phase === 'game-over' && perSlotResult) {
        stateEl.textContent = perSlotResult[snake.slotIndex] === 'win' ? 'Escaped' : 'Down';
      } else if (state.coOp?.playersAtExit?.[snake.slotIndex]) {
        stateEl.textContent = 'At exit';
      } else if (state.phase === 'starting') {
        stateEl.textContent = 'Ready';
      } else {
        stateEl.textContent = snake.alive ? 'Exploring' : 'Down';
      }
    } else if (state.phase === 'game-over' && perSlotResult) {
      stateEl.textContent = perSlotResult[snake.slotIndex] === 'win' ? 'Winner' : perSlotResult[snake.slotIndex] === 'lose' ? 'Eliminated' : 'Draw';
    } else if (state.phase === 'starting') {
      stateEl.textContent = 'Ready';
    } else {
      stateEl.textContent = snake.alive ? 'Alive' : 'Out';
    }
  });
}

function describeCoOpProgress(state) {
  const reached = Number(Boolean(state.coOp?.playersAtExit?.[0])) + Number(Boolean(state.coOp?.playersAtExit?.[1]));
  if (reached === 2) return 'Both players are at the exit. Resolution incoming.';
  if (reached === 1) return 'One player is safe at the exit. Guide the teammate in.';
  return 'Reach the glowing exit together. Walls are deadly.';
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
  syncFullscreenMode();
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

  // Lock page scroll/zoom during mobile gameplay so swipes only control the snake.
  document.body.classList.toggle('swipe-active', touchControlsVisible);

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

/* --- Mobile fullscreen mode --- */
function isMobileFullscreenCandidate() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const shortEdge = Math.min(width, height);
  const touchPreferred = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  // Match phones and small tablets: short edge <= 600px with touch, or short edge <= 480px without
  return shortEdge <= 480 || (touchPreferred && shortEdge <= 600);
}

function shouldEnterFullscreen() {
  if (!isMobileFullscreenCandidate()) return false;
  const phase = latestGameState?.phase || latestLobbyState?.phase || 'entry';
  return phase === 'starting' || phase === 'in-progress' || phase === 'game-over';
}

function enterFullscreenMode() {
  if (document.body.classList.contains('mobile-fullscreen')) return;
  document.body.classList.add('mobile-fullscreen');
  // Prevent iOS Safari pull-to-refresh and overscroll
  document.body.style.overscrollBehavior = 'none';
  updateMobileHud();
}

function exitFullscreenMode() {
  if (!document.body.classList.contains('mobile-fullscreen')) return;
  document.body.classList.remove('mobile-fullscreen');
  document.body.style.overscrollBehavior = '';
  // Restore scroll position
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
}

function syncFullscreenMode() {
  if (shouldEnterFullscreen()) {
    enterFullscreenMode();
  } else {
    exitFullscreenMode();
  }
}

function updateMobileHud() {
  if (!document.body.classList.contains('mobile-fullscreen')) return;
  const state = latestGameState;
  const roomCode = state?.roomCode || latestLobbyState?.roomCode || '----';

  mobileHudRoomEl.textContent = roomCode;

  if (!state) {
    mobileHudScoreEl.textContent = '0';
    mobileHudPhaseEl.textContent = 'Waiting';
    return;
  }

  const yourScore = yourSlotIndex !== null && state.snakes?.[yourSlotIndex]
    ? state.snakes[yourSlotIndex].score
    : 0;
  mobileHudScoreEl.textContent = String(yourScore);

  if (state.phase === 'starting') {
    mobileHudPhaseEl.textContent = `Starting ${state.countdownSecondsRemaining ?? 3}`;
  } else if (state.phase === 'in-progress') {
    mobileHudPhaseEl.textContent = 'Live';
  } else if (state.phase === 'game-over') {
    const outcome = getYourOutcome(state.result?.bySlot);
    mobileHudPhaseEl.textContent = soloMode
      ? `Score: ${yourScore}`
      : (outcome === 'win' ? 'You Win' : outcome === 'lose' ? 'You Lose' : 'Draw');
  }
}

function setupTouchControls() {
  touchControlButtons.forEach((button) => {
    button.addEventListener('click', () => {
      requestDirection(button.dataset.direction, 'touch-button');
    });
  });

  // Swipe gestures: listen on document so swipes work anywhere during mobile gameplay.
  // Direction fires on pointermove (not pointerup) for instant response — no finger-lift delay.
  document.addEventListener('pointerdown', handleSwipePointerDown, { passive: true });
  document.addEventListener('pointermove', handleSwipePointerMove, { passive: true });
  document.addEventListener('pointerup', handleSwipePointerUp, { passive: true });
  document.addEventListener('pointercancel', handleSwipePointerCancel);

  // Prevent scroll/zoom via touch events during mobile gameplay.
  // touch-action: none on body handles most browsers, but iOS Safari sometimes
  // needs an explicit touchmove preventDefault as a belt-and-suspenders approach.
  document.addEventListener('touchmove', handleSwipeTouchMove, { passive: false });
}

function isSwipeGameplayActive() {
  return shouldShowTouchControls({
    layoutMode: viewportState.layoutMode,
    touchPreferred: viewportState.touchPreferred,
    phase: latestGameState?.phase || latestLobbyState?.phase || 'entry',
    screen: uiState.screen,
  });
}

function handleSwipePointerDown(event) {
  if (!isSwipeGameplayActive() || event.pointerType === 'mouse') return;

  audioManager.unlock();
  swipeState.active = true;
  swipeState.directionFired = false;
  swipeState.pointerId = event.pointerId;
  swipeState.startX = event.clientX;
  swipeState.startY = event.clientY;
  swipeState.startAt = Date.now();
}

function handleSwipePointerMove(event) {
  if (!swipeState.active || swipeState.pointerId !== event.pointerId) return;
  if (swipeState.directionFired) return;

  const elapsed = Date.now() - swipeState.startAt;
  if (elapsed > SWIPE_MAX_DURATION_MS) {
    resetSwipeState();
    return;
  }

  const direction = resolveSwipeDirection(swipeState.startX, swipeState.startY, event.clientX, event.clientY);
  if (direction) {
    swipeState.directionFired = true;
    requestDirection(direction, 'swipe');
    showSwipeIndicator(direction);
  }
}

function handleSwipePointerUp(event) {
  if (!swipeState.active || swipeState.pointerId !== event.pointerId) return;

  // If no direction was fired during the gesture (very short swipe), try one last time on release.
  if (!swipeState.directionFired) {
    const direction = resolveSwipeDirection(swipeState.startX, swipeState.startY, event.clientX, event.clientY);
    if (direction) {
      requestDirection(direction, 'swipe');
      showSwipeIndicator(direction);
    }
  }

  resetSwipeState();
}

function handleSwipePointerCancel(event) {
  if (swipeState.pointerId === event.pointerId) {
    resetSwipeState();
  }
}

function handleSwipeTouchMove(event) {
  // Block native scroll/zoom when swipe gameplay is active.
  if (isSwipeGameplayActive()) {
    event.preventDefault();
  }
}

function showSwipeIndicator(direction) {
  // 1. Pulse the matching arrow button.
  const button = touchControlButtons.find((b) => b.dataset.direction === direction);
  if (button) {
    pulseConfirmation(button, false);
  }

  // 2. Flash a directional trail on the game stage at the swipe origin.
  if (swipeTrailEl && swipeState.startX != null) {
    const rect = gameStageEl.getBoundingClientRect();
    const x = swipeState.startX - rect.left;
    const y = swipeState.startY - rect.top;
    swipeTrailEl.style.left = `${x}px`;
    swipeTrailEl.style.top = `${y}px`;
    swipeTrailEl.dataset.direction = direction;
    swipeTrailEl.className = 'swipe-trail';
    void swipeTrailEl.offsetWidth;
    swipeTrailEl.classList.add('is-active');
    clearTimeout(swipeTrailEl._hideTimer);
    swipeTrailEl._hideTimer = setTimeout(() => {
      swipeTrailEl.className = 'swipe-trail';
    }, 320);
  }
}

function resetSwipeState() {
  swipeState.active = false;
  swipeState.pointerId = null;
  swipeState.startX = 0;
  swipeState.startY = 0;
  swipeState.startAt = 0;
  swipeState.directionFired = false;
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
