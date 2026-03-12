const socket = io();

const statusEl = document.getElementById('status');
const errorEl = document.getElementById('error');
const panelEl = document.querySelector('.panel');
const panelTopEl = document.getElementById('panelTop');
const entryEl = document.getElementById('entry');
const lobbyEl = document.getElementById('lobby');
const gamePanelEl = document.getElementById('gamePanel');
const roomCodeInput = document.getElementById('roomCodeInput');
const roomCodeDisplay = document.getElementById('roomCodeDisplay');
const gameRoomCodeEl = document.getElementById('gameRoomCode');
const playersEl = document.getElementById('players');
const readyButton = document.getElementById('readyButton');
const lobbyMessage = document.getElementById('lobbyMessage');
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
const playerState1El = document.getElementById('playerState1');
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
  statusEl.textContent = 'Connected. Create a room or join with a code.';
  applyPhaseTheme('entry', 'neutral');
  showScreen('entry');
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
  applyPhaseTheme('countdown', 'neutral');
  showScreen('gameplay');
  triggerCountdownStep(payload.secondsRemaining);
});

socket.on('game:start', (payload) => {
  statusEl.textContent = `Game started in room ${payload.roomCode}.`;
  gamePhaseLabel.textContent = 'In progress';
  gameStatusInlineEl.textContent = 'Game live.';
  countdownLabel.textContent = 'Countdown: GO';
  speedLabel.textContent = `Speed: ${payload.tickIntervalMs}ms`;
  gameMessageEl.textContent = 'Gameplay screen active. Lobby is fully hidden during the match.';
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
  audioManager.play('ui.click');
  socket.emit('room:create');
});

document.getElementById('joinRoomButton').addEventListener('click', () => {
  audioManager.play('ui.click');
  socket.emit('room:join', { roomCode: roomCodeInput.value });
});

async function copyActiveRoomCode() {
  const roomCode = latestLobbyState?.roomCode || latestGameState?.roomCode;
  if (!roomCode) return;
  try {
    await navigator.clipboard.writeText(roomCode);
    const copiedText = 'Room code copied.';
    statusEl.textContent = copiedText;
    if (!gamePanelEl.classList.contains('hidden')) {
      gameStatusInlineEl.textContent = copiedText;
    }
    audioManager.play('ui.copy');
    pulseConfirmation(soundToggleButton, false);
  } catch {
    statusEl.textContent = 'Could not copy room code in this browser.';
  }
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

function renderLobby(state) {
  roomCodeDisplay.textContent = state.roomCode;
  gameRoomCodeEl.textContent = state.roomCode;
  phaseBadge.textContent = formatPhaseLabel(state.phase);
  lobbyMessage.textContent = state.message || '';
  playersEl.innerHTML = '';

  const gameplayFocused = state.phase === 'starting' || state.phase === 'in-progress' || state.phase === 'game-over';
  applyPhaseTheme(gameplayFocused ? getPhaseTheme(state.phase) : 'lobby', 'neutral');
  showScreen(gameplayFocused ? 'gameplay' : 'lobby');

  for (const player of state.players) {
    const card = document.createElement('div');
    card.className = `player ${player.isYou ? 'you' : ''} ${player.isReady ? 'ready' : ''} ${player.isOccupied ? '' : 'waiting'}`;
    card.innerHTML = `
      <div class="player-meta">
        <strong>${player.label}${player.isYou ? ' (You)' : ''}</strong>
        <span>${player.isOccupied ? 'Joined' : 'Waiting'}</span>
      </div>
      <div class="player-state">${player.isOccupied ? (player.isReady ? 'Ready to launch' : 'Not ready yet') : 'Open slot'}</div>
    `;
    playersEl.appendChild(card);
  }

  const you = state.players.find((player) => player.isYou);
  readyButton.textContent = you?.isReady ? 'Unready' : 'Ready up';
  readyButton.disabled = !you || !you.isOccupied || gameplayFocused;
  readyButton.classList.toggle('is-waiting', !!state.allPlayersPresent && !state.allReady);

  if (gameplayFocused) {
    gamePhaseLabel.textContent = state.phase === 'starting' ? 'Countdown' : state.phase === 'game-over' ? 'Game over' : 'In progress';
    gameStatusInlineEl.textContent = state.phase === 'starting'
      ? 'Match starts in moments.'
      : state.phase === 'game-over'
        ? 'Round complete.'
        : 'Game live.';
    gameMessageEl.textContent = state.phase === 'starting'
      ? 'Both players are ready. Transitioning into gameplay.'
      : state.phase === 'game-over'
        ? 'Round finished. Choose rematch or wait for room changes.'
        : 'Gameplay screen active. Lobby is fully hidden during the match.';
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

  let statusText = message || 'Want another round? Accept rematch to stay in this room.';
  let buttonText = 'Accept rematch';
  let buttonDisabled = true;
  let bannerTitle = 'Rematch ready';

  if (!rematch?.available) {
    statusText = message || 'Rematch unavailable until both players are present.';
    buttonText = 'Rematch unavailable';
    bannerTitle = 'Waiting for both players';
  } else if (rematch.bothAccepted) {
    statusText = 'Both players accepted. Starting a fresh countdown…';
    buttonText = 'Rematch starting…';
    bannerTitle = 'Countdown loading';
    postGameBannerButton.classList.add('accepted');
  } else if (rematch.waitingForOtherPlayer) {
    statusText = 'Rematch requested. Waiting for the other player.';
    buttonText = 'Waiting for other player';
    buttonDisabled = true;
    bannerTitle = 'Request sent';
    rematchPanelEl.classList.add('highlighted');
    rematchButton.classList.add('is-waiting');
    postGameBannerButton.classList.add('waiting');
  } else if (rematch.requestedBySlot[0] || rematch.requestedBySlot[1]) {
    statusText = 'Your opponent wants a rematch. Accept to restart in the same room.';
    buttonText = 'Accept rematch now';
    buttonDisabled = false;
    bannerTitle = 'Opponent wants another round';
    rematchPanelEl.classList.add('highlighted');
  } else {
    statusText = message || 'Want another round? Accept rematch to stay in this room.';
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
  score0El.textContent = String(state.snakes[0].score);
  score1El.textContent = String(state.snakes[1].score);
  speedLabel.textContent = `Speed: ${state.tickIntervalMs}ms`;

  updateScoreCards(state, perSlotResult);

  if (state.phase === 'starting') {
    gamePhaseLabel.textContent = 'Countdown';
    gameStatusInlineEl.textContent = 'Match starts in moments.';
    countdownLabel.textContent = `Countdown: ${state.countdownSecondsRemaining ?? 3}`;
    gameMessageEl.textContent = 'Queue your opening turn now. Snakes stay still until the countdown ends.';
    applyPhaseTheme('countdown', 'neutral');
  } else if (state.phase === 'in-progress') {
    gamePhaseLabel.textContent = 'In progress';
    gameStatusInlineEl.textContent = 'Game live.';
    countdownLabel.textContent = `Tick: ${state.tickNumber}`;
    gameMessageEl.textContent = 'Avoid walls, avoid bodies, and race for the shared food.';
    applyPhaseTheme('live', 'neutral');
  } else {
    gamePhaseLabel.textContent = 'Game over';
    countdownLabel.textContent = 'Countdown: closed soon';
    const yourOutcome = getYourOutcome(perSlotResult);
    gameStatusInlineEl.textContent = yourOutcome === 'win' ? 'You win!' : yourOutcome === 'lose' ? 'You lose.' : 'Round ended in a draw.';
    gameMessageEl.textContent = yourOutcome === 'win' ? 'Result: you win.' : yourOutcome === 'lose' ? 'Result: you lose.' : 'Result: draw.';
    applyPhaseTheme('result', yourOutcome);
  }

  paintBoard(state);
}

function showScreen(screen) {
  const gameplayActive = screen === 'gameplay';
  uiState.screen = screen;
  entryEl.classList.toggle('hidden', screen !== 'entry');
  lobbyEl.classList.toggle('hidden', screen !== 'lobby');
  gamePanelEl.classList.toggle('hidden', !gameplayActive);
  panelEl.classList.toggle('gameplay-active', gameplayActive);
  panelTopEl.classList.toggle('hidden', gameplayActive);
  statusEl.classList.toggle('hidden', gameplayActive);
  errorEl.classList.toggle('hidden', gameplayActive || !errorEl.textContent);
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
    statusEl.textContent = `${nextOpponent.label} joined the room.`;
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
  countdownOverlayEl.classList.remove('hidden');
  pulseTransientClass(countdownOverlayEl, 'is-active', MOTION_REDUCED() ? 40 : 520);
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
  const portrait = window.matchMedia('(orientation: portrait)').matches;
  if (width <= 768) return portrait ? 'mobile-portrait' : 'mobile-landscape';
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
