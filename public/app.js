const socket = io();

const statusEl = document.getElementById('status');
const errorEl = document.getElementById('error');
const panelEl = document.querySelector('.panel');
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
const boardEl = document.getElementById('board');
const gamePhaseLabel = document.getElementById('gamePhaseLabel');
const countdownLabel = document.getElementById('countdownLabel');
const speedLabel = document.getElementById('speedLabel');
const score0El = document.getElementById('score0');
const score1El = document.getElementById('score1');
const gameMessageEl = document.getElementById('gameMessage');
const buildMarkerEl = document.getElementById('buildMarker');

let latestLobbyState = null;
let latestGameState = null;
let yourSlotIndex = null;
let boardReady = false;

loadBuildMarker();

socket.on('connect', () => {
  statusEl.textContent = 'Connected. Create a room or join with a code.';
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
});

socket.on('room:joined', (payload) => {
  yourSlotIndex = payload.yourSlotIndex;
  errorEl.classList.add('hidden');
  statusEl.textContent = 'Joined room.';
});

socket.on('player:left', () => {
  statusEl.textContent = 'A player left. Waiting for a replacement.';
});

socket.on('lobby:state', (payload) => {
  latestLobbyState = payload;
  if (payload.yourSlotIndex !== undefined) {
    yourSlotIndex = payload.yourSlotIndex;
  }
  renderLobby(payload);
});

socket.on('game:countdown', (payload) => {
  statusEl.textContent = `Match starts in ${payload.secondsRemaining}...`;
  showScreen('gameplay');
});

socket.on('game:start', (payload) => {
  statusEl.textContent = `Game started in room ${payload.roomCode}.`;
  gamePhaseLabel.textContent = 'In progress';
  countdownLabel.textContent = 'Countdown: go';
  speedLabel.textContent = `Speed: ${payload.tickIntervalMs}ms`;
  gameMessageEl.textContent = 'Gameplay screen active. Lobby is fully hidden during the match.';
  showScreen('gameplay');
});

socket.on('game:state', (payload) => {
  latestGameState = payload;
  renderGame(payload);
});

socket.on('game:ended', (payload) => {
  latestGameState = payload.finalState;
  renderGame(payload.finalState, payload.result.bySlot);
  const yourOutcome = yourSlotIndex === null ? 'draw' : payload.result.bySlot[yourSlotIndex];
  statusEl.textContent = yourOutcome === 'win' ? 'You win!' : yourOutcome === 'lose' ? 'You lose.' : 'Round ended in a draw.';
});

socket.on('room:closed', (payload) => {
  latestGameState = null;
  latestLobbyState = null;
  boardEl.innerHTML = '';
  boardReady = false;
  roomCodeDisplay.textContent = '----';
  gameRoomCodeEl.textContent = '----';
  phaseBadge.textContent = 'Closed';
  showScreen('entry');
  statusEl.textContent = payload.reason === 'player-disconnected'
    ? 'Room closed because a player disconnected. Create or join a new room to play again.'
    : 'Room closed. Create or join a new room to play again.';
});

document.getElementById('createRoomButton').addEventListener('click', () => {
  socket.emit('room:create');
});

document.getElementById('joinRoomButton').addEventListener('click', () => {
  socket.emit('room:join', { roomCode: roomCodeInput.value });
});

async function copyActiveRoomCode() {
  const roomCode = latestLobbyState?.roomCode || latestGameState?.roomCode;
  if (!roomCode) return;
  await navigator.clipboard.writeText(roomCode);
  statusEl.textContent = 'Room code copied.';
}

document.getElementById('copyRoomCodeButton').addEventListener('click', copyActiveRoomCode);
document.getElementById('copyGameRoomCodeButton').addEventListener('click', copyActiveRoomCode);

readyButton.addEventListener('click', () => {
  if (!latestLobbyState) return;
  const you = latestLobbyState.players.find((player) => player.isYou);
  if (!you) return;
  socket.emit('player:ready:set', { ready: !you.isReady });
});

document.addEventListener('keydown', (event) => {
  const direction = keyToDirection(event.key);
  if (!direction || !latestGameState) return;
  socket.emit('player:direction:set', { direction });
});

async function loadBuildMarker() {
  try {
    const response = await fetch(`/build-info.json?ts=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Build info request failed with ${response.status}`);
    }

    const buildInfo = await response.json();
    buildMarkerEl.textContent = `Build: ${buildInfo.displayVersion}`;
    buildMarkerEl.title = `Version ${buildInfo.version} • Commit ${buildInfo.commit} • Built ${buildInfo.builtAt}`;
  } catch (error) {
    console.error(error);
    buildMarkerEl.textContent = 'Build: unavailable';
    buildMarkerEl.title = 'Build metadata could not be loaded.';
  }
}

function renderLobby(state) {
  roomCodeDisplay.textContent = state.roomCode;
  gameRoomCodeEl.textContent = state.roomCode;
  phaseBadge.textContent = state.phase;
  lobbyMessage.textContent = state.message || '';
  playersEl.innerHTML = '';

  const gameplayFocused = state.phase === 'starting' || state.phase === 'in-progress' || state.phase === 'game-over';
  showScreen(gameplayFocused ? 'gameplay' : 'lobby');

  for (const player of state.players) {
    const card = document.createElement('div');
    card.className = `player ${player.isYou ? 'you' : ''}`;
    card.innerHTML = `
      <div class="player-meta">
        <strong>${player.label}${player.isYou ? ' (You)' : ''}</strong>
        <span>${player.isOccupied ? 'Joined' : 'Waiting'}</span>
      </div>
      <div class="player-state">${player.isOccupied ? (player.isReady ? 'Ready' : 'Not ready') : 'Open slot'}</div>
    `;
    playersEl.appendChild(card);
  }

  const you = state.players.find((player) => player.isYou);
  readyButton.textContent = you?.isReady ? 'Unready' : 'Ready';
  readyButton.disabled = !you || !you.isOccupied || state.phase === 'starting' || state.phase === 'in-progress' || state.phase === 'game-over';

  if (gameplayFocused) {
    gamePhaseLabel.textContent = state.phase === 'starting' ? 'Countdown' : state.phase === 'game-over' ? 'Game over' : 'In progress';
    gameMessageEl.textContent = state.phase === 'starting'
      ? 'Both players are ready. Transitioning into gameplay.'
      : state.phase === 'game-over'
        ? 'Round finished. Lobby remains hidden while the result screen is shown.'
        : 'Gameplay screen active. Lobby is fully hidden during the match.';
  }
}

function renderGame(state, perSlotResult) {
  showScreen('gameplay');
  gameRoomCodeEl.textContent = state.roomCode;
  ensureBoard(state.board.width, state.board.height);
  score0El.textContent = String(state.snakes[0].score);
  score1El.textContent = String(state.snakes[1].score);
  speedLabel.textContent = `Speed: ${state.tickIntervalMs}ms`;

  if (state.phase === 'starting') {
    gamePhaseLabel.textContent = 'Countdown';
    countdownLabel.textContent = `Countdown: ${state.countdownSecondsRemaining ?? 3}`;
    gameMessageEl.textContent = 'Queue your opening turn now. Snakes stay still until the countdown ends.';
  } else if (state.phase === 'in-progress') {
    gamePhaseLabel.textContent = 'In progress';
    countdownLabel.textContent = `Tick: ${state.tickNumber}`;
    gameMessageEl.textContent = 'Avoid walls, avoid bodies, and race for the shared food.';
  } else {
    gamePhaseLabel.textContent = 'Game over';
    countdownLabel.textContent = 'Countdown: closed soon';
    const yourOutcome = perSlotResult && yourSlotIndex !== null ? perSlotResult[yourSlotIndex] : 'draw';
    gameMessageEl.textContent = yourOutcome === 'win' ? 'Result: you win.' : yourOutcome === 'lose' ? 'Result: you lose.' : 'Result: draw.';
  }

  paintBoard(state);
}

function showScreen(screen) {
  entryEl.classList.toggle('hidden', screen !== 'entry');
  lobbyEl.classList.toggle('hidden', screen !== 'lobby');
  gamePanelEl.classList.toggle('hidden', screen !== 'gameplay');
  panelEl.classList.toggle('gameplay-active', screen === 'gameplay');
}

function ensureBoard(width, height) {
  if (boardReady) return;
  boardEl.innerHTML = '';
  boardEl.style.gridTemplateColumns = `repeat(${width}, minmax(0, 1fr))`;
  for (let i = 0; i < width * height; i += 1) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    boardEl.appendChild(cell);
  }
  boardReady = true;
}

function paintBoard(state) {
  const cells = Array.from(boardEl.children);
  for (const cell of cells) {
    cell.className = 'cell';
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

function paintCell(x, y, className, width) {
  const cell = boardEl.children[y * width + x];
  if (cell) cell.classList.add(className);
}

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
