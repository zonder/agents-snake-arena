const socket = io();

const statusEl = document.getElementById('status');
const errorEl = document.getElementById('error');
const lobbyEl = document.getElementById('lobby');
const roomCodeInput = document.getElementById('roomCodeInput');
const roomCodeDisplay = document.getElementById('roomCodeDisplay');
const playersEl = document.getElementById('players');
const readyButton = document.getElementById('readyButton');
const lobbyMessage = document.getElementById('lobbyMessage');
const phaseBadge = document.getElementById('phaseBadge');

let latestLobbyState = null;

socket.on('connect', () => {
  statusEl.textContent = 'Connected. Create a room or join with a code.';
});

socket.on('room:error', (payload) => {
  errorEl.textContent = payload.message;
  errorEl.classList.remove('hidden');
});

socket.on('room:created', () => {
  errorEl.classList.add('hidden');
  statusEl.textContent = 'Room created.';
});

socket.on('room:joined', () => {
  errorEl.classList.add('hidden');
  statusEl.textContent = 'Joined room.';
});

socket.on('player:left', () => {
  statusEl.textContent = 'A player left the lobby. Waiting for a replacement.';
});

socket.on('lobby:state', (payload) => {
  latestLobbyState = payload;
  renderLobby(payload);
});

socket.on('game:start', (payload) => {
  statusEl.textContent = `Game started for room ${payload.roomCode}. Gameplay handoff placeholder reached.`;
  readyButton.disabled = true;
});

document.getElementById('createRoomButton').addEventListener('click', () => {
  socket.emit('room:create');
});

document.getElementById('joinRoomButton').addEventListener('click', () => {
  socket.emit('room:join', { roomCode: roomCodeInput.value });
});

document.getElementById('copyRoomCodeButton').addEventListener('click', async () => {
  if (!latestLobbyState) return;
  await navigator.clipboard.writeText(latestLobbyState.roomCode);
  statusEl.textContent = 'Room code copied.';
});

readyButton.addEventListener('click', () => {
  if (!latestLobbyState) return;
  const you = latestLobbyState.players.find((player) => player.isYou);
  if (!you) return;
  socket.emit('player:ready:set', { ready: !you.isReady });
});

function renderLobby(state) {
  lobbyEl.classList.remove('hidden');
  roomCodeDisplay.textContent = state.roomCode;
  phaseBadge.textContent = state.phase;
  lobbyMessage.textContent = state.message || '';
  playersEl.innerHTML = '';

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
  readyButton.disabled = !you || !you.isOccupied || state.phase === 'starting' || state.phase === 'in-progress';
}
