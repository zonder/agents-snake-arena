import { randomBytes } from 'node:crypto';
import type {
  Direction,
  GameCountdownPayload,
  GameEndedPayload,
  GameRematchStatePayload,
  GameStartPayload,
  GameStatePayload,
  LobbyErrorReason,
  LobbyStatePayload,
  PlayerLeftPayload,
  PlayerSessionPayload,
  RematchView,
  ReconnectView,
  RoomCreatedPayload,
  RoomJoinedPayload,
  RoomMode,
  RoomPhase,
  SessionResumeFailedPayload,
  SessionResumeRequestPayload,
  SessionResumeSucceededPayload,
} from '../shared/contracts.js';
import { formatPlayerReference, getPlayerLabel, toPlayerIdentityView, validatePlayerName } from '../shared/playerName.js';
import {
  applyDisconnectResult,
  advanceOneTick,
  createInitialCoOpMatchState,
  createInitialMatchState,
  queueDirectionInput,
  toOutcomeForSlot,
  type MatchState,
} from './gameLogic.js';

const RECONNECT_WINDOW_MS = 30_000;
const RESUME_COUNTDOWN_MS = 3_000;

type ClientEventType =
  | 'room:created' | 'room:joined' | 'lobby:state' | 'room:error' | 'player:left' | 'game:countdown' | 'game:start' | 'game:state'
  | 'game:ended' | 'game:rematch-state' | 'room:closed' | 'session:issued' | 'session:resume:succeeded' | 'session:resume:failed';

interface PlayerSlot {
  slotIndex: 0 | 1;
  playerId: string | null;
  socketId: string | null;
  connected: boolean;
  ready: boolean;
  name: string | null;
  reconnectToken: string | null;
  disconnectedAt: number | null;
  reservationExpiresAt: number | null;
}
interface RematchState { requestedBySlot: { 0: boolean; 1: boolean }; }
interface DisconnectWindow { slotIndex: 0 | 1; startedAt: number; expiresAt: number; affectedPhase: RoomPhase; }
interface PausedMatchState { pausedAt: number; disconnectedSlotIndex: 0 | 1; phaseToResume: 'starting' | 'in-progress'; }
interface RoomRecord {
  roomCode: string; roomMode: RoomMode; phase: RoomPhase; createdAt: number; players: [PlayerSlot, PlayerSlot]; version: number; match: MatchState | null;
  countdown: { startedAt: number; endsAt: number; secondsRemaining: 3 | 2 | 1 | 0 } | null; teardownAt: number | null; rematch: RematchState;
  disconnectWindow: DisconnectWindow | null; pausedMatch: PausedMatchState | null; soloMode: boolean;
}
export interface ClientEvent { type: ClientEventType; socketId: string; payload: unknown; }
export interface ServiceResult { events: ClientEvent[]; }
interface RuntimeRecord { countdownTimers: NodeJS.Timeout[]; tickTimer: NodeJS.Timeout | null; teardownTimer: NodeJS.Timeout | null; reservationTimer: NodeJS.Timeout | null; }

export class RoomService {
  private readonly rooms = new Map<string, RoomRecord>();
  private readonly runtimes = new Map<string, RuntimeRecord>();
  private readonly socketToRoom = new Map<string, string>();
  private readonly socketToPlayer = new Map<string, string>();
  private nextPlayerId = 1;
  private emitExternal: (events: ClientEvent[]) => void = () => {};

  setEventSink(emitExternal: (events: ClientEvent[]) => void) { this.emitExternal = emitExternal; }

  private isCoOpRoom(room: Pick<RoomRecord, 'roomMode'>): boolean { return room.roomMode === 'co-op'; }

  createRoom(socketId: string, rawName: string, roomMode: 'versus' | 'co-op' = 'versus'): ServiceResult {
    this.leaveCurrentRoom(socketId, 'left');
    const validation = validatePlayerName(rawName);
    if (!validation.valid) return { events: [this.error(socketId, 'INVALID_PLAYER_NAME')] };
    const roomCode = this.generateUniqueRoomCode();
    const playerId = this.allocatePlayerId();
    const issuedAt = Date.now();
    const room: RoomRecord = { roomCode, roomMode, phase: 'waiting-for-players', createdAt: issuedAt, version: 1, match: null, countdown: null, teardownAt: null,
      rematch: { requestedBySlot: { 0: false, 1: false } }, disconnectWindow: null, pausedMatch: null, soloMode: false,
      players: [
        { slotIndex: 0, playerId, socketId, connected: true, ready: false, name: validation.normalized, reconnectToken: this.generateReconnectToken(), disconnectedAt: null, reservationExpiresAt: null },
        { slotIndex: 1, playerId: null, socketId: null, connected: false, ready: false, name: null, reconnectToken: null, disconnectedAt: null, reservationExpiresAt: null },
      ],
    };
    this.rooms.set(roomCode, room); this.socketToRoom.set(socketId, roomCode); this.socketToPlayer.set(socketId, playerId);
    return { events: [
      { type: 'room:created', socketId, payload: { roomCode, roomMode, yourSlotIndex: 0 } satisfies RoomCreatedPayload },
      this.buildSessionIssuedEvent(room, room.players[0], socketId, issuedAt),
      ...this.buildLobbyStateEvents(room),
    ]};
  }

  createSoloRoom(socketId: string, rawName: string): ServiceResult {
    this.leaveCurrentRoom(socketId, 'left');
    const validation = validatePlayerName(rawName);
    if (!validation.valid) return { events: [this.error(socketId, 'INVALID_PLAYER_NAME')] };
    const roomCode = this.generateUniqueRoomCode();
    const playerId = this.allocatePlayerId();
    const issuedAt = Date.now();
    const room: RoomRecord = { roomCode, roomMode: 'solo', phase: 'lobby', createdAt: issuedAt, version: 1, match: null, countdown: null, teardownAt: null,
      rematch: { requestedBySlot: { 0: false, 1: false } }, disconnectWindow: null, pausedMatch: null, soloMode: true,
      players: [
        { slotIndex: 0, playerId, socketId, connected: true, ready: true, name: validation.normalized, reconnectToken: this.generateReconnectToken(), disconnectedAt: null, reservationExpiresAt: null },
        { slotIndex: 1, playerId: null, socketId: null, connected: false, ready: false, name: null, reconnectToken: null, disconnectedAt: null, reservationExpiresAt: null },
      ],
    };
    this.rooms.set(roomCode, room); this.socketToRoom.set(socketId, roomCode); this.socketToPlayer.set(socketId, playerId);
    const events: ClientEvent[] = [
      { type: 'room:created', socketId, payload: { roomCode, roomMode: 'solo', yourSlotIndex: 0 } satisfies RoomCreatedPayload },
      this.buildSessionIssuedEvent(room, room.players[0], socketId, issuedAt),
      ...this.buildLobbyStateEvents(room),
    ];
    room.match = createInitialMatchState(room.roomCode, Math.random, true);
    room.version += 1;
    events.push(...this.beginCountdown(room, 3000));
    return { events };
  }

  joinRoom(socketId: string, rawRoomCode: string, rawName: string): ServiceResult {
    this.leaveCurrentRoom(socketId, 'left');
    const roomCode = this.normalizeRoomCode(rawRoomCode);
    if (!this.isValidRoomCode(roomCode)) return { events: [this.error(socketId, 'INVALID_ROOM_CODE')] };
    const validation = validatePlayerName(rawName);
    if (!validation.valid) return { events: [this.error(socketId, 'INVALID_PLAYER_NAME')] };
    const room = this.rooms.get(roomCode);
    if (!room) return { events: [this.error(socketId, 'ROOM_NOT_FOUND')] };
    if (room.soloMode) return { events: [this.error(socketId, 'ROOM_FULL')] };
    if (room.phase === 'starting' || room.phase === 'in-progress') return { events: [this.error(socketId, 'GAME_ALREADY_STARTED')] };
    const emptySlot = room.players.find((player) => !player.playerId);
    if (!emptySlot) return { events: [this.error(socketId, 'ROOM_FULL')] };
    const playerId = this.allocatePlayerId();
    const issuedAt = Date.now();
    Object.assign(emptySlot, { playerId, socketId, connected: true, ready: false, name: validation.normalized, reconnectToken: this.generateReconnectToken(), disconnectedAt: null, reservationExpiresAt: null });
    this.socketToRoom.set(socketId, roomCode); this.socketToPlayer.set(socketId, playerId); this.clearRematchState(room); room.version += 1; room.phase = this.computePhase(room);
    return { events: [
      { type: 'room:joined', socketId, payload: { roomCode, roomMode: room.roomMode, yourSlotIndex: emptySlot.slotIndex } satisfies RoomJoinedPayload },
      this.buildSessionIssuedEvent(room, emptySlot, socketId, issuedAt),
      ...this.afterLobbyMutation(room),
    ]};
  }

  resumeSession(socketId: string, payload: SessionResumeRequestPayload): ServiceResult { /* unchanged core logic */
    this.leaveCurrentRoom(socketId, 'left'); const roomCode = this.normalizeRoomCode(payload.roomCode); const room = this.rooms.get(roomCode);
    if (!room) return { events: [this.resumeError(socketId, roomCode, 'ROOM_NOT_FOUND', 'Room no longer exists.')] };
    const slot = room.players.find((player) => player.reconnectToken === payload.reconnectToken);
    if (!slot) return { events: [this.resumeError(socketId, roomCode, 'TOKEN_MISMATCH', 'Reconnect token did not match this room.')] };
    if (!slot.reservationExpiresAt || slot.connected) return { events: [this.resumeError(socketId, roomCode, slot.connected ? 'SLOT_ALREADY_ACTIVE' : 'SLOT_NOT_RESERVED', slot.connected ? 'That slot is already active.' : 'That slot is not reserved for reconnect.')] };
    if (slot.reservationExpiresAt <= Date.now()) { this.expireReservation(room.roomCode, slot.slotIndex, true); return { events: [this.resumeError(socketId, roomCode, 'RESERVATION_EXPIRED', 'Reconnect window expired. That slot is no longer reserved.')] }; }
    slot.socketId = socketId; slot.connected = true; slot.disconnectedAt = null; slot.ready = room.phase === 'game-over' ? slot.ready : false;
    this.socketToRoom.set(socketId, roomCode); this.socketToPlayer.set(socketId, slot.playerId!); if (!room.pausedMatch) this.clearReservation(room, slot.slotIndex); room.version += 1;
    const resumedAt = Date.now(); const events: ClientEvent[] = [{ type: 'session:resume:succeeded', socketId, payload: { roomCode, slotIndex: slot.slotIndex, phase: room.phase, resumedAt, version: room.version } satisfies SessionResumeSucceededPayload }];
    if (room.pausedMatch) events.push(...this.startResumeCountdown(room)); else { if (room.phase !== 'game-over') room.phase = this.computePhase(room); events.push(...this.buildLobbyStateEvents(room), ...this.buildGameStateEvents(room), ...this.buildRematchStateEvents(room)); }
    return { events };
  }
  setReady(socketId: string, ready: boolean): ServiceResult { const room = this.getRoomForSocket(socketId); if (!room || (room.phase !== 'waiting-for-players' && room.phase !== 'lobby') || room.disconnectWindow) return { events: [this.error(socketId, 'ACTION_NOT_ALLOWED')] }; const player = room.players.find((slot) => slot.socketId === socketId); if (!player) return { events: [this.error(socketId, 'ACTION_NOT_ALLOWED')] }; player.ready = ready; room.version += 1; room.phase = this.computePhase(room); return { events: this.afterLobbyMutation(room) }; }
  requestRematch(socketId: string): ServiceResult { const room = this.getRoomForSocket(socketId); if (!room || room.phase !== 'game-over' || room.disconnectWindow) return { events: [this.error(socketId, 'ACTION_NOT_ALLOWED')] }; const player = room.players.find((slot) => slot.socketId === socketId); if (!player) return { events: [this.error(socketId, 'ACTION_NOT_ALLOWED')] }; if (room.rematch.requestedBySlot[player.slotIndex]) return { events: [] }; room.rematch.requestedBySlot[player.slotIndex] = true; room.version += 1; const events = [...this.buildLobbyStateEvents(room), ...this.buildGameStateEvents(room), ...this.buildRematchStateEvents(room)]; const bothRequested = room.rematch.requestedBySlot[0] && room.rematch.requestedBySlot[1]; if (!room.soloMode && (!this.areBothPlayersPresent(room) || !bothRequested)) return { events }; room.phase = 'starting'; room.version += 1; room.match = this.createInitialRoomMatch(room); room.countdown = null; room.teardownAt = null; room.players.forEach((slot) => { slot.ready = false; }); this.clearRematchState(room); events.push(...this.beginCountdown(room, 3000)); return { events }; }
  setDirection(socketId: string, direction: Direction): ServiceResult { const room = this.getRoomForSocket(socketId); if (!room || !room.match || (room.phase !== 'starting' && room.phase !== 'in-progress') || room.pausedMatch || room.disconnectWindow) return { events: [this.error(socketId, 'ACTION_NOT_ALLOWED')] }; const player = room.players.find((slot) => slot.socketId === socketId); if (!player) return { events: [this.error(socketId, 'ACTION_NOT_ALLOWED')] }; const queued = queueDirectionInput(room.match.snakes[player.slotIndex], direction); return queued ? { events: [] } : { events: [this.error(socketId, 'ACTION_NOT_ALLOWED')] }; }
  disconnect(socketId: string): ServiceResult { const room = this.getRoomForSocket(socketId); return this.leaveCurrentRoom(socketId, room?.roomMode === 'solo' ? 'left' : 'disconnected'); }

  private leaveCurrentRoom(socketId: string, reason: 'left' | 'disconnected'): ServiceResult { const roomCode = this.socketToRoom.get(socketId); if (!roomCode) return { events: [] }; const room = this.rooms.get(roomCode); this.socketToRoom.delete(socketId); this.socketToPlayer.delete(socketId); if (!room) return { events: [] }; const leavingPlayer = room.players.find((slot) => slot.socketId === socketId); if (!leavingPlayer) return { events: [] }; return reason === 'left' ? this.removePlayerCompletely(room, leavingPlayer.slotIndex, reason) : this.reserveDisconnectedPlayer(room, leavingPlayer.slotIndex); }
  private removePlayerCompletely(room: RoomRecord, slotIndex: 0 | 1, reason: 'left' | 'disconnected'): ServiceResult { const leavingPlayer = room.players[slotIndex]; Object.assign(leavingPlayer, { playerId: null, socketId: null, connected: false, ready: false, name: null, reconnectToken: null, disconnectedAt: null, reservationExpiresAt: null }); if (room.disconnectWindow?.slotIndex === slotIndex) this.clearReservation(room, slotIndex); const remainingPlayers = room.players.filter((slot) => slot.playerId); if (remainingPlayers.length === 0) { this.disposeRoom(room.roomCode); return { events: [] }; } if (room.phase === 'starting' || room.phase === 'in-progress') return { events: this.finishMatch(room, applyDisconnectResult(room.match!, slotIndex, Date.now()), reason === 'disconnected' ? 'player-disconnected' : 'round-complete') }; remainingPlayers.forEach((slot) => { slot.ready = false; }); this.clearRematchState(room); room.countdown = null; room.pausedMatch = null; if (room.phase === 'game-over') { room.match = null; room.teardownAt = null; } room.version += 1; room.phase = 'waiting-for-players'; const events: ClientEvent[] = remainingPlayers.flatMap((slot) => slot.socketId ? [{ type: 'player:left', socketId: slot.socketId, payload: { roomCode: room.roomCode, slotIndex, reason } satisfies PlayerLeftPayload }] : []); events.push(...this.buildLobbyStateEvents(room), ...this.buildRematchStateEvents(room)); return { events }; }
  private reserveDisconnectedPlayer(room: RoomRecord, slotIndex: 0 | 1): ServiceResult { const leavingPlayer = room.players[slotIndex]; leavingPlayer.socketId = null; leavingPlayer.connected = false; leavingPlayer.ready = false; leavingPlayer.disconnectedAt = Date.now(); leavingPlayer.reservationExpiresAt = leavingPlayer.disconnectedAt + RECONNECT_WINDOW_MS; const remainingPlayers = room.players.filter((slot) => slot.playerId && slot.connected); if (remainingPlayers.length === 0) { this.disposeRoom(room.roomCode); return { events: [] }; } this.clearRematchState(room); room.version += 1; room.disconnectWindow = { slotIndex, startedAt: leavingPlayer.disconnectedAt, expiresAt: leavingPlayer.reservationExpiresAt, affectedPhase: room.phase }; if (room.phase === 'starting' || room.phase === 'in-progress') { room.pausedMatch = { pausedAt: Date.now(), disconnectedSlotIndex: slotIndex, phaseToResume: room.phase }; this.cancelActiveProgress(room.roomCode); } remainingPlayers.forEach((slot) => { if (room.phase !== 'game-over') slot.ready = false; }); this.scheduleReservationExpiry(room.roomCode, slotIndex, RECONNECT_WINDOW_MS); return { events: this.buildSnapshotEvents(room) }; }
  private startResumeCountdown(room: RoomRecord): ClientEvent[] { room.version += 1; return this.beginCountdown(room, RESUME_COUNTDOWN_MS); }
  private beginCountdown(room: RoomRecord, durationMs: number): ClientEvent[] { room.phase = 'starting'; const now = Date.now(); room.countdown = { startedAt: now, endsAt: now + durationMs, secondsRemaining: 3 }; const events = [...this.buildLobbyStateEvents(room), ...this.buildGameStateEvents(room, 3), ...this.buildCountdownEvents(room, 3, now), ...this.buildRematchStateEvents(room)]; this.startCountdown(room.roomCode); return events; }
  private afterLobbyMutation(room: RoomRecord): ClientEvent[] { const events = this.buildLobbyStateEvents(room); if (!this.canStart(room)) return events; room.match = this.createInitialRoomMatch(room); room.version += 1; this.clearRematchState(room); events.push(...this.beginCountdown(room, 3000)); return events; }
  private startCountdown(roomCode: string) { const room = this.rooms.get(roomCode); if (!room || !room.countdown) return; const runtime = this.ensureRuntime(roomCode); runtime.countdownTimers.forEach(clearTimeout); runtime.countdownTimers = []; ([2,1,0] as const).forEach((second, index) => { const timer = setTimeout(() => { const activeRoom = this.rooms.get(roomCode); if (!activeRoom || activeRoom.phase !== 'starting' || !activeRoom.countdown || !activeRoom.match || activeRoom.disconnectWindow) return; activeRoom.countdown.secondsRemaining = second; activeRoom.version += 1; const now = Date.now(); const events: ClientEvent[] = [...this.buildLobbyStateEvents(activeRoom), ...this.buildGameStateEvents(activeRoom, second), ...this.buildCountdownEvents(activeRoom, second, now), ...this.buildRematchStateEvents(activeRoom)]; if (second === 0) events.push(...this.beginActiveMatch(activeRoom, now)); this.emitExternal(events); }, (index + 1) * 1000); runtime.countdownTimers.push(timer); }); }
  private beginActiveMatch(room: RoomRecord, now: number): ClientEvent[] { if (!room.match) return []; room.phase = 'in-progress'; room.version += 1; room.countdown = null; room.pausedMatch = null; this.clearReservation(room); room.match.status = 'active'; room.match.startedAt = now; const players = room.players.map((player) => ({ ...toPlayerIdentityView(player), name: player.name ?? getPlayerLabel(player.slotIndex) })) as GameStartPayload['players']; const payload: GameStartPayload = { roomCode: room.roomCode, roomMode: room.roomMode, phase: 'in-progress', board: room.match.board, players, tickIntervalMs: room.match.tickIntervalMs, startedAt: now, version: room.version, coOp: room.match.coOp ? { ...room.match.coOp, exit: { ...room.match.coOp.exit }, walls: room.match.coOp.walls.map((wall) => ({ ...wall })), playersAtExit: { ...room.match.coOp.playersAtExit }, switches: room.match.coOp.switches.map((sw) => ({ ...sw, position: { ...sw.position } })), doors: room.match.coOp.doors.map((door) => ({ ...door, position: { ...door.position }, requiresSwitches: [...door.requiresSwitches] })) } : undefined }; const events = this.buildLobbyStateEvents(room); for (const player of room.players) if (player.socketId) events.push({ type: 'game:start', socketId: player.socketId, payload }); this.scheduleNextTick(room.roomCode, room.match.tickIntervalMs); return events; }
  private scheduleNextTick(roomCode: string, delayMs: number) { const runtime = this.ensureRuntime(roomCode); runtime.tickTimer = setTimeout(() => { const room = this.rooms.get(roomCode); if (!room || room.phase !== 'in-progress' || !room.match || room.pausedMatch || room.disconnectWindow) return; room.match = advanceOneTick(room.match, Date.now()); room.version += 1; if (room.match.result) { this.emitExternal(this.finishMatch(room, room.match, 'round-complete')); return; } this.emitExternal(this.buildGameStateEvents(room)); this.scheduleNextTick(roomCode, room.match.tickIntervalMs); }, delayMs); }
  private finishMatch(room: RoomRecord, match: MatchState, closeReason: 'round-complete' | 'player-disconnected'): ClientEvent[] { room.match = match; room.phase = 'game-over'; room.version += 1; room.teardownAt = null; room.countdown = null; room.pausedMatch = null; this.clearReservation(room); this.clearRematchState(room); this.cancelActiveProgress(room.roomCode); const finalState = this.serializeGameState(room); const payload: GameEndedPayload = { roomCode: room.roomCode, phase: 'game-over', result: { bySlot: { 0: toOutcomeForSlot(match, 0), 1: toOutcomeForSlot(match, 1) }, winnerSlotIndex: match.winnerSlotIndex, deathReasons: match.deathReasons }, finalState, teardownAt: room.teardownAt, version: room.version }; const events = this.buildLobbyStateEvents(room); events.push(...this.buildGameStateEvents(room), ...this.buildRematchStateEvents(room, closeReason === 'player-disconnected' ? 'Opponent forfeited by disconnect.' : 'Round complete. Choose rematch to play again.')); for (const player of room.players) if (player.socketId) events.push({ type: 'game:ended', socketId: player.socketId, payload }); return events; }
  private expireReservation(roomCode: string, slotIndex: 0 | 1, silent = false) { const room = this.rooms.get(roomCode); if (!room) return; const reservedPlayer = room.players[slotIndex]; if (!reservedPlayer.playerId || reservedPlayer.connected || room.disconnectWindow?.slotIndex !== slotIndex) return; if (room.disconnectWindow.affectedPhase === 'starting' || room.disconnectWindow.affectedPhase === 'in-progress') { const events = this.finishMatch(room, applyDisconnectResult(room.match!, slotIndex, Date.now()), 'player-disconnected'); if (!silent) this.emitExternal(events); return; } const events = this.removePlayerCompletely(room, slotIndex, 'disconnected').events; if (!silent) this.emitExternal(events); }
  private scheduleReservationExpiry(roomCode: string, slotIndex: 0 | 1, delayMs: number) { const runtime = this.ensureRuntime(roomCode); if (runtime.reservationTimer) clearTimeout(runtime.reservationTimer); runtime.reservationTimer = setTimeout(() => this.expireReservation(roomCode, slotIndex), delayMs); }
  private clearReservation(room: RoomRecord, slotIndex?: 0 | 1) { if (slotIndex !== undefined) { const player = room.players[slotIndex]; player.disconnectedAt = null; player.reservationExpiresAt = null; } room.disconnectWindow = null; const runtime = this.runtimes.get(room.roomCode); if (runtime?.reservationTimer) { clearTimeout(runtime.reservationTimer); runtime.reservationTimer = null; } }
  private buildSnapshotEvents(room: RoomRecord): ClientEvent[] { return [...this.buildLobbyStateEvents(room), ...this.buildGameStateEvents(room), ...this.buildRematchStateEvents(room)]; }
  private cancelActiveProgress(roomCode: string) { const runtime = this.ensureRuntime(roomCode); runtime.countdownTimers.forEach(clearTimeout); runtime.countdownTimers = []; if (runtime.tickTimer) { clearTimeout(runtime.tickTimer); runtime.tickTimer = null; } }
  private ensureRuntime(roomCode: string): RuntimeRecord { const existing = this.runtimes.get(roomCode); if (existing) return existing; const runtime: RuntimeRecord = { countdownTimers: [], tickTimer: null, teardownTimer: null, reservationTimer: null }; this.runtimes.set(roomCode, runtime); return runtime; }
  private cancelRuntime(roomCode: string) { const existing = this.runtimes.get(roomCode); if (!existing) return; for (const timer of existing.countdownTimers) clearTimeout(timer); if (existing.tickTimer) clearTimeout(existing.tickTimer); if (existing.teardownTimer) clearTimeout(existing.teardownTimer); if (existing.reservationTimer) clearTimeout(existing.reservationTimer); this.runtimes.delete(roomCode); }
  private disposeRoom(roomCode: string) { this.cancelRuntime(roomCode); this.rooms.delete(roomCode); }
  private buildLobbyStateEvents(room: RoomRecord): ClientEvent[] { return room.players.flatMap((player) => player.socketId ? [{ type: 'lobby:state' as const, socketId: player.socketId, payload: this.serializeLobbyState(room, player.socketId) }] : []); }
  private buildRematchStateEvents(room: RoomRecord, message?: string): ClientEvent[] { const phase = room.phase === 'in-progress' ? null : room.phase; if (!phase) return []; return room.players.flatMap((player) => { if (!player.socketId) return []; const payload: GameRematchStatePayload = { roomCode: room.roomCode, roomMode: room.roomMode, phase, players: this.serializePlayers(room), rematch: this.buildRematchView(room, player.socketId), reconnect: this.buildReconnectView(room, player.socketId), yourSlotIndex: player.slotIndex, version: room.version, message }; return [{ type: 'game:rematch-state' as const, socketId: player.socketId, payload }]; }); }
  private buildCountdownEvents(room: RoomRecord, secondsRemaining: 3 | 2 | 1 | 0, now: number): ClientEvent[] { if (!room.countdown) return []; const payload: GameCountdownPayload = { roomCode: room.roomCode, phase: 'starting', secondsRemaining, startsAt: room.countdown.startedAt, serverNow: now, version: room.version }; return room.players.flatMap((player) => player.socketId ? [{ type: 'game:countdown' as const, socketId: player.socketId, payload }] : []); }
  private buildGameStateEvents(room: RoomRecord, countdownSecondsRemaining?: 3 | 2 | 1 | 0): ClientEvent[] { if (!room.match) return []; return room.players.flatMap((player) => player.socketId ? [{ type: 'game:state' as const, socketId: player.socketId, payload: this.serializeGameState(room, player.socketId, countdownSecondsRemaining) }] : []); }
  private serializePlayers(room: RoomRecord) { return room.players.map((player) => toPlayerIdentityView(player)) as LobbyStatePayload['players'] extends infer _ ? [ReturnType<typeof toPlayerIdentityView>, ReturnType<typeof toPlayerIdentityView>] : never; }
  private serializeLobbyState(room: RoomRecord, viewerSocketId: string): LobbyStatePayload { const occupiedCount = room.players.filter((player) => player.playerId).length as 0 | 1 | 2; const allPlayersPresent = occupiedCount === 2 && room.players.every((player) => player.connected); const allReady = allPlayersPresent && room.players.every((player) => player.ready); const viewer = room.players.find((player) => player.socketId === viewerSocketId) ?? null; return { roomCode: room.roomCode, roomMode: room.roomMode, phase: room.phase, yourSlotIndex: viewer?.slotIndex ?? null, players: room.players.map((player) => ({ ...toPlayerIdentityView(player), isOccupied: Boolean(player.playerId), isReady: Boolean(player.playerId) && player.ready, isConnected: Boolean(player.connected), isReserved: Boolean(player.playerId && !player.connected && player.reservationExpiresAt), isYou: player.socketId === viewerSocketId })) as LobbyStatePayload['players'], occupiedCount, allPlayersPresent, allReady, canStart: this.canStart(room), soloMode: room.soloMode, version: room.version, message: this.getLobbyMessage(room), rematch: this.buildRematchView(room, viewerSocketId), reconnect: this.buildReconnectView(room, viewerSocketId) }; }
  private serializeGameState(room: RoomRecord, viewerSocketId?: string, countdownSecondsRemaining?: 3 | 2 | 1 | 0): GameStatePayload { const match = room.match!; const viewer = viewerSocketId ? room.players.find((slot) => slot.socketId === viewerSocketId) ?? null : null; return { roomCode: room.roomCode, roomMode: room.roomMode, phase: room.phase === 'game-over' ? 'game-over' : room.phase === 'starting' ? 'starting' : 'in-progress', yourSlotIndex: viewer?.slotIndex ?? null, tickNumber: match.tickNumber, board: match.board, food: match.food, snakes: match.snakes.map((snake) => ({ slotIndex: snake.slotIndex, body: snake.body, direction: snake.direction, alive: snake.alive, score: snake.score })) as GameStatePayload['snakes'], players: this.serializePlayers(room), foodsEaten: match.foodsEaten, tickIntervalMs: match.tickIntervalMs, countdownSecondsRemaining, paused: Boolean(room.pausedMatch), reconnect: this.buildReconnectView(room, viewerSocketId), result: room.phase === 'game-over' ? { outcome: match.result === 'draw' ? 'draw' : match.result === 'co-op-win' ? 'win' : match.result === 'co-op-fail' ? 'lose' : match.winnerSlotIndex === 0 ? 'win' : 'lose', winnerSlotIndex: match.winnerSlotIndex, deathReasons: match.deathReasons } : undefined, rematch: this.buildRematchView(room, viewerSocketId), version: room.version, coOp: match.coOp ? { ...match.coOp, exit: { ...match.coOp.exit }, walls: match.coOp.walls.map((wall) => ({ ...wall })), playersAtExit: { ...match.coOp.playersAtExit }, switches: match.coOp.switches.map((sw) => ({ ...sw, position: { ...sw.position } })), doors: match.coOp.doors.map((door) => ({ ...door, position: { ...door.position }, requiresSwitches: [...door.requiresSwitches] })) } : undefined }; }
  private buildReconnectView(room: RoomRecord, viewerSocketId?: string): ReconnectView { const viewer = viewerSocketId ? room.players.find((slot) => slot.socketId === viewerSocketId) ?? null : null; const window = room.disconnectWindow; const disconnectedPlayer = window ? room.players[window.slotIndex] : null; const secondsRemaining = window ? Math.max(0, Math.ceil((window.expiresAt - Date.now()) / 1000)) : null; return { active: Boolean(window), status: window ? (room.pausedMatch && room.players[window.slotIndex].connected ? 'resume-countdown' : 'waiting-for-player') : 'none', disconnectedSlotIndex: window?.slotIndex ?? null, disconnectedPlayerName: disconnectedPlayer?.name ?? null, disconnectedPlayerDisplayName: disconnectedPlayer ? formatPlayerReference(disconnectedPlayer, { disambiguateWith: room.players.filter((entry) => entry.slotIndex !== disconnectedPlayer.slotIndex).map((entry) => entry.name) }) : null, reservedUntil: window?.expiresAt ?? null, secondsRemaining, affectedPhase: window?.affectedPhase ?? null, yourSlotReserved: Boolean(viewer && window && viewer.slotIndex === window.slotIndex), canAutoResume: Boolean(viewer && window && viewer.slotIndex === window.slotIndex) }; }
  private buildRematchView(room: RoomRecord, viewerSocketId?: string): RematchView { const eligiblePlayerCount = room.players.filter((player) => player.playerId && player.connected).length as 0 | 1 | 2; const bothAccepted = eligiblePlayerCount === 2 && room.rematch.requestedBySlot[0] && room.rematch.requestedBySlot[1]; const acceptedCount = Number(room.rematch.requestedBySlot[0]) + Number(room.rematch.requestedBySlot[1]); const available = room.phase === 'game-over' && (room.soloMode ? eligiblePlayerCount >= 1 : eligiblePlayerCount === 2) && !room.disconnectWindow; const viewer = viewerSocketId ? room.players.find((slot) => slot.socketId === viewerSocketId) : null; const requestedByYou = viewer ? room.rematch.requestedBySlot[viewer.slotIndex] : false; const waitingForOtherPlayer = !room.soloMode && available && requestedByYou && !bothAccepted; const status = !available ? 'unavailable' : room.soloMode ? (room.rematch.requestedBySlot[0] ? 'accepted' : 'idle') : bothAccepted ? 'accepted' : acceptedCount === 1 ? 'waiting' : 'idle'; return { available, status, requestedBySlot: { ...room.rematch.requestedBySlot }, requestedByYou, waitingForOtherPlayer, bothAccepted: room.soloMode ? room.rematch.requestedBySlot[0] : bothAccepted, eligiblePlayerCount }; }
  private getLobbyMessage(room: RoomRecord): string { if (room.disconnectWindow) { const player = room.players[room.disconnectWindow.slotIndex]; const seconds = Math.max(0, Math.ceil((room.disconnectWindow.expiresAt - Date.now()) / 1000)); const text = formatPlayerReference(player, { disambiguateWith: room.players.filter((entry) => entry.slotIndex !== player.slotIndex).map((entry) => entry.name) }); return room.pausedMatch ? `${text} disconnected. Waiting ${seconds}s for reconnect.` : `${text} disconnected. Slot reserved for ${seconds}s.`; } if (room.phase === 'starting' && room.countdown) return `Match starts in ${room.countdown.secondsRemaining}…`; if (room.phase === 'in-progress') return this.isCoOpRoom(room) ? (room.match?.coOp?.switches?.length ? 'Co-op puzzle room. Activate switches together to open doors.' : 'Co-op run in progress. Reach the exit together.') : 'Match in progress.';if (room.phase === 'game-over') return this.buildRematchView(room).available ? 'Round complete. Choose rematch to play again.' : 'Round complete. Waiting for opponent status to change.'; if (this.isCoOpRoom(room)) return room.players.filter((player) => player.playerId).length === 2 ? 'Co-op room ready. Game starts automatically when both players are ready.' : 'Waiting for co-op partner.'; return room.players.filter((player) => player.playerId).length === 2 ? 'Game starts automatically when both players are ready.' : room.soloMode ? 'Solo mode. Starting game…' : 'Waiting for opponent.'; }
  private canStart(room: RoomRecord): boolean { return !room.match && !room.disconnectWindow && room.players.every((player) => player.playerId && player.connected && player.ready); }
  private computePhase(room: RoomRecord): RoomPhase { return room.players.filter((player) => player.playerId).length < 2 ? 'waiting-for-players' : 'lobby'; }
  private areBothPlayersPresent(room: RoomRecord): boolean { return room.players.every((player) => player.playerId && player.connected && player.socketId); }
  private createInitialRoomMatch(room: RoomRecord): MatchState { return this.isCoOpRoom(room) ? createInitialCoOpMatchState(room.roomCode, Math.random) : createInitialMatchState(room.roomCode, Math.random, room.soloMode); }
  private clearRematchState(room: RoomRecord) { room.rematch.requestedBySlot[0] = false; room.rematch.requestedBySlot[1] = false; }
  private error(socketId: string, reason: LobbyErrorReason): ClientEvent { const messages: Record<LobbyErrorReason, string> = { INVALID_ROOM_CODE: 'Enter a valid four-letter room code.', ROOM_NOT_FOUND: 'Room not found.', ROOM_FULL: 'Room is full right now.', GAME_ALREADY_STARTED: 'This room is already mid-match.', ACTION_NOT_ALLOWED: 'That action is not allowed right now.', INVALID_PLAYER_NAME: 'Enter a name up to 12 characters without emoji.' }; return { type: 'room:error', socketId, payload: { reason, message: messages[reason] } }; }
  private resumeError(socketId: string, roomCode: string, reason: SessionResumeFailedPayload['reason'], message: string): ClientEvent { return { type: 'session:resume:failed', socketId, payload: { roomCode, reason, message } satisfies SessionResumeFailedPayload }; }
  private buildSessionIssuedEvent(room: RoomRecord, slot: PlayerSlot, socketId: string, issuedAt: number): ClientEvent { return { type: 'session:issued', socketId, payload: { roomCode: room.roomCode, roomMode: room.roomMode, slotIndex: slot.slotIndex, reconnectToken: slot.reconnectToken!, issuedAt, version: room.version } satisfies PlayerSessionPayload }; }
  private generateReconnectToken() { return randomBytes(18).toString('base64url'); }
  private getRoomForSocket(socketId: string): RoomRecord | null { const roomCode = this.socketToRoom.get(socketId); return roomCode ? this.rooms.get(roomCode) ?? null : null; }
  private generateUniqueRoomCode() { let roomCode = ''; do roomCode = Array.from({ length: 4 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join(''); while (this.rooms.has(roomCode)); return roomCode; }
  private allocatePlayerId() { return `player-${this.nextPlayerId++}`; }
  private normalizeRoomCode(roomCode: string) { return roomCode.trim().toUpperCase(); }
  private isValidRoomCode(roomCode: string) { return /^[A-Z]{4}$/.test(roomCode); }
}
