import type {
  Direction,
  GameCountdownPayload,
  GameEndedPayload,
  GameStartPayload,
  GameStatePayload,
  LobbyErrorReason,
  LobbyStatePayload,
  PlayerLeftPayload,
  RoomClosedPayload,
  RoomCreatedPayload,
  RoomJoinedPayload,
  RoomPhase,
} from '../shared/contracts.js';
import {
  applyDisconnectResult,
  advanceOneTick,
  createInitialMatchState,
  queueDirectionInput,
  toOutcomeForSlot,
  type MatchState,
} from './gameLogic.js';

interface PlayerSlot {
  slotIndex: 0 | 1;
  playerId: string | null;
  socketId: string | null;
  connected: boolean;
  ready: boolean;
}

interface RoomRecord {
  roomCode: string;
  phase: RoomPhase;
  createdAt: number;
  players: [PlayerSlot, PlayerSlot];
  version: number;
  match: MatchState | null;
  countdown: { startedAt: number; endsAt: number; secondsRemaining: 3 | 2 | 1 | 0 } | null;
  teardownAt: number | null;
}

export interface ClientEvent {
  type:
    | 'room:created'
    | 'room:joined'
    | 'lobby:state'
    | 'room:error'
    | 'player:left'
    | 'game:countdown'
    | 'game:start'
    | 'game:state'
    | 'game:ended'
    | 'room:closed';
  socketId: string;
  payload: unknown;
}

export interface ServiceResult {
  events: ClientEvent[];
}

interface RuntimeRecord {
  countdownTimers: NodeJS.Timeout[];
  tickTimer: NodeJS.Timeout | null;
  teardownTimer: NodeJS.Timeout | null;
}

export class RoomService {
  private readonly rooms = new Map<string, RoomRecord>();
  private readonly runtimes = new Map<string, RuntimeRecord>();
  private readonly socketToRoom = new Map<string, string>();
  private readonly socketToPlayer = new Map<string, string>();
  private nextPlayerId = 1;
  private emitExternal: (events: ClientEvent[]) => void = () => {};

  setEventSink(emitExternal: (events: ClientEvent[]) => void) {
    this.emitExternal = emitExternal;
  }

  createRoom(socketId: string): ServiceResult {
    this.leaveCurrentRoom(socketId, 'left');

    const roomCode = this.generateUniqueRoomCode();
    const playerId = this.allocatePlayerId();
    const room: RoomRecord = {
      roomCode,
      phase: 'waiting-for-players',
      createdAt: Date.now(),
      version: 1,
      match: null,
      countdown: null,
      teardownAt: null,
      players: [
        { slotIndex: 0, playerId, socketId, connected: true, ready: false },
        { slotIndex: 1, playerId: null, socketId: null, connected: false, ready: false },
      ],
    };

    this.rooms.set(roomCode, room);
    this.socketToRoom.set(socketId, roomCode);
    this.socketToPlayer.set(socketId, playerId);

    return {
      events: [
        { type: 'room:created', socketId, payload: { roomCode, yourSlotIndex: 0 } satisfies RoomCreatedPayload },
        ...this.buildLobbyStateEvents(room),
      ],
    };
  }

  joinRoom(socketId: string, rawRoomCode: string): ServiceResult {
    this.leaveCurrentRoom(socketId, 'left');

    const roomCode = this.normalizeRoomCode(rawRoomCode);
    if (!this.isValidRoomCode(roomCode)) return { events: [this.error(socketId, 'INVALID_ROOM_CODE')] };

    const room = this.rooms.get(roomCode);
    if (!room) return { events: [this.error(socketId, 'ROOM_NOT_FOUND')] };
    if (room.phase === 'starting' || room.phase === 'in-progress' || room.phase === 'game-over') {
      return { events: [this.error(socketId, 'GAME_ALREADY_STARTED')] };
    }

    const emptySlot = room.players.find((player) => !player.playerId);
    if (!emptySlot) return { events: [this.error(socketId, 'ROOM_FULL')] };

    const playerId = this.allocatePlayerId();
    emptySlot.playerId = playerId;
    emptySlot.socketId = socketId;
    emptySlot.connected = true;
    emptySlot.ready = false;
    this.socketToRoom.set(socketId, roomCode);
    this.socketToPlayer.set(socketId, playerId);
    room.version += 1;
    room.phase = this.computePhase(room);

    return {
      events: [
        { type: 'room:joined', socketId, payload: { roomCode, yourSlotIndex: emptySlot.slotIndex } satisfies RoomJoinedPayload },
        ...this.afterLobbyMutation(room),
      ],
    };
  }

  setReady(socketId: string, ready: boolean): ServiceResult {
    const room = this.getRoomForSocket(socketId);
    if (!room || (room.phase !== 'waiting-for-players' && room.phase !== 'lobby')) {
      return { events: [this.error(socketId, 'ACTION_NOT_ALLOWED')] };
    }

    const player = room.players.find((slot) => slot.socketId === socketId);
    if (!player) return { events: [this.error(socketId, 'ACTION_NOT_ALLOWED')] };

    player.ready = ready;
    room.version += 1;
    room.phase = this.computePhase(room);

    return { events: this.afterLobbyMutation(room) };
  }

  setDirection(socketId: string, direction: Direction): ServiceResult {
    const room = this.getRoomForSocket(socketId);
    if (!room || !room.match || (room.phase !== 'starting' && room.phase !== 'in-progress')) {
      return { events: [this.error(socketId, 'ACTION_NOT_ALLOWED')] };
    }

    const player = room.players.find((slot) => slot.socketId === socketId);
    if (!player) return { events: [this.error(socketId, 'ACTION_NOT_ALLOWED')] };

    const queued = queueDirectionInput(room.match.snakes[player.slotIndex], direction);
    return queued ? { events: [] } : { events: [this.error(socketId, 'ACTION_NOT_ALLOWED')] };
  }

  disconnect(socketId: string): ServiceResult {
    return this.leaveCurrentRoom(socketId, 'disconnected');
  }

  private leaveCurrentRoom(socketId: string, reason: 'left' | 'disconnected'): ServiceResult {
    const roomCode = this.socketToRoom.get(socketId);
    if (!roomCode) return { events: [] };

    const room = this.rooms.get(roomCode);
    this.socketToRoom.delete(socketId);
    this.socketToPlayer.delete(socketId);
    if (!room) return { events: [] };

    const leavingPlayer = room.players.find((slot) => slot.socketId === socketId);
    if (!leavingPlayer) return { events: [] };

    const slotIndex = leavingPlayer.slotIndex;
    leavingPlayer.playerId = null;
    leavingPlayer.socketId = null;
    leavingPlayer.connected = false;
    leavingPlayer.ready = false;

    const remainingPlayers = room.players.filter((slot) => slot.playerId);
    if (remainingPlayers.length === 0) {
      this.disposeRoom(roomCode);
      return { events: [] };
    }

    if (room.phase === 'starting' || room.phase === 'in-progress') {
      const events = this.finishMatch(room, applyDisconnectResult(room.match!, slotIndex, Date.now()), reason === 'disconnected' ? 'player-disconnected' : 'round-complete');
      return { events };
    }

    remainingPlayers[0].ready = false;
    room.version += 1;
    room.phase = 'waiting-for-players';

    const events: ClientEvent[] = remainingPlayers.flatMap((slot) => [
      { type: 'player:left', socketId: slot.socketId!, payload: { roomCode, slotIndex, reason } satisfies PlayerLeftPayload },
    ]);
    events.push(...this.buildLobbyStateEvents(room));
    return { events };
  }

  private afterLobbyMutation(room: RoomRecord): ClientEvent[] {
    const events = this.buildLobbyStateEvents(room);
    if (!this.canStart(room)) return events;

    room.phase = 'starting';
    room.version += 1;
    room.match = createInitialMatchState(room.roomCode);
    const now = Date.now();
    room.countdown = { startedAt: now, endsAt: now + 3000, secondsRemaining: 3 };
    events.push(...this.buildLobbyStateEvents(room));
    events.push(...this.buildGameStateEvents(room, 3));
    events.push(...this.buildCountdownEvents(room, 3, now));

    this.startCountdown(room.roomCode);
    return events;
  }

  private startCountdown(roomCode: string) {
    this.cancelRuntime(roomCode);
    const runtime: RuntimeRecord = { countdownTimers: [], tickTimer: null, teardownTimer: null };
    const room = this.rooms.get(roomCode);
    if (!room || !room.countdown) return;

    ([2, 1, 0] as const).forEach((second, index) => {
      const timer = setTimeout(() => {
        const activeRoom = this.rooms.get(roomCode);
        if (!activeRoom || activeRoom.phase !== 'starting' || !activeRoom.countdown || !activeRoom.match) return;
        activeRoom.countdown.secondsRemaining = second;
        activeRoom.version += 1;
        const now = Date.now();
        const events: ClientEvent[] = [
          ...this.buildLobbyStateEvents(activeRoom),
          ...this.buildGameStateEvents(activeRoom, second),
          ...this.buildCountdownEvents(activeRoom, second, now),
        ];
        if (second === 0) {
          events.push(...this.beginActiveMatch(activeRoom, now));
        }
        this.emitExternal(events);
      }, (index + 1) * 1000);
      runtime.countdownTimers.push(timer);
    });

    this.runtimes.set(roomCode, runtime);
  }

  private beginActiveMatch(room: RoomRecord, now: number): ClientEvent[] {
    if (!room.match) return [];
    room.phase = 'in-progress';
    room.version += 1;
    room.countdown = null;
    room.match.status = 'active';
    room.match.startedAt = now;
    const payload: GameStartPayload = {
      roomCode: room.roomCode,
      phase: 'in-progress',
      board: room.match.board,
      players: [
        { slotIndex: 0, label: 'Player 1' },
        { slotIndex: 1, label: 'Player 2' },
      ],
      tickIntervalMs: room.match.tickIntervalMs,
      startedAt: now,
      version: room.version,
    };
    const events = this.buildLobbyStateEvents(room);
    for (const player of room.players) {
      if (player.socketId) events.push({ type: 'game:start', socketId: player.socketId, payload });
    }
    this.scheduleNextTick(room.roomCode, room.match.tickIntervalMs);
    return events;
  }

  private scheduleNextTick(roomCode: string, delayMs: number) {
    const runtime = this.runtimes.get(roomCode);
    if (!runtime) return;
    runtime.tickTimer = setTimeout(() => {
      const room = this.rooms.get(roomCode);
      if (!room || room.phase !== 'in-progress' || !room.match) return;
      room.match = advanceOneTick(room.match, Date.now());
      room.version += 1;
      if (room.match.result) {
        this.emitExternal(this.finishMatch(room, room.match, 'round-complete'));
        return;
      }
      this.emitExternal(this.buildGameStateEvents(room));
      this.scheduleNextTick(roomCode, room.match.tickIntervalMs);
    }, delayMs);
  }

  private finishMatch(room: RoomRecord, match: MatchState, closeReason: 'round-complete' | 'player-disconnected'): ClientEvent[] {
    room.match = match;
    room.phase = 'game-over';
    room.version += 1;
    room.teardownAt = Date.now() + 3000;
    this.cancelRuntime(room.roomCode);

    const finalState = this.serializeGameState(room);
    const payload: GameEndedPayload = {
      roomCode: room.roomCode,
      phase: 'game-over',
      result: {
        bySlot: {
          0: toOutcomeForSlot(match, 0),
          1: toOutcomeForSlot(match, 1),
        },
        winnerSlotIndex: match.winnerSlotIndex,
        deathReasons: match.deathReasons,
      },
      finalState,
      teardownAt: room.teardownAt,
      version: room.version,
    };

    const events = this.buildLobbyStateEvents(room);
    events.push(...this.buildGameStateEvents(room));
    for (const player of room.players) {
      if (player.socketId) events.push({ type: 'game:ended', socketId: player.socketId, payload });
    }

    const runtime: RuntimeRecord = { countdownTimers: [], tickTimer: null, teardownTimer: null };
    runtime.teardownTimer = setTimeout(() => {
      const activeRoom = this.rooms.get(room.roomCode);
      if (!activeRoom) return;
      const closeEvents: ClientEvent[] = [];
      for (const player of activeRoom.players) {
        if (!player.socketId) continue;
        closeEvents.push({
          type: 'room:closed',
          socketId: player.socketId,
          payload: { roomCode: activeRoom.roomCode, reason: closeReason, version: activeRoom.version } satisfies RoomClosedPayload,
        });
        this.socketToRoom.delete(player.socketId);
        this.socketToPlayer.delete(player.socketId);
      }
      this.disposeRoom(activeRoom.roomCode);
      this.emitExternal(closeEvents);
    }, 3000);
    this.runtimes.set(room.roomCode, runtime);

    return events;
  }

  private cancelRuntime(roomCode: string) {
    const existing = this.runtimes.get(roomCode);
    if (!existing) return;
    for (const timer of existing.countdownTimers) clearTimeout(timer);
    if (existing.tickTimer) clearTimeout(existing.tickTimer);
    if (existing.teardownTimer) clearTimeout(existing.teardownTimer);
    this.runtimes.delete(roomCode);
  }

  private disposeRoom(roomCode: string) {
    this.cancelRuntime(roomCode);
    this.rooms.delete(roomCode);
  }

  private buildLobbyStateEvents(room: RoomRecord): ClientEvent[] {
    return room.players.flatMap((player) => {
      if (!player.socketId) return [];
      return [{ type: 'lobby:state' as const, socketId: player.socketId, payload: this.serializeLobbyState(room, player.socketId) }];
    });
  }

  private buildCountdownEvents(room: RoomRecord, secondsRemaining: 3 | 2 | 1 | 0, now: number): ClientEvent[] {
    if (!room.countdown) return [];
    const payload: GameCountdownPayload = {
      roomCode: room.roomCode,
      phase: 'starting',
      secondsRemaining,
      startsAt: room.countdown.startedAt,
      serverNow: now,
      version: room.version,
    };
    return room.players.flatMap((player) => (player.socketId ? [{ type: 'game:countdown' as const, socketId: player.socketId, payload }] : []));
  }

  private buildGameStateEvents(room: RoomRecord, countdownSecondsRemaining?: 3 | 2 | 1 | 0): ClientEvent[] {
    if (!room.match) return [];
    const payload = this.serializeGameState(room, countdownSecondsRemaining);
    return room.players.flatMap((player) => (player.socketId ? [{ type: 'game:state' as const, socketId: player.socketId, payload }] : []));
  }

  private serializeLobbyState(room: RoomRecord, viewerSocketId: string): LobbyStatePayload {
    const occupiedCount = room.players.filter((player) => player.playerId).length as 0 | 1 | 2;
    const allPlayersPresent = occupiedCount === 2;
    const allReady = allPlayersPresent && room.players.every((player) => player.ready);
    const canStart = this.canStart(room);

    return {
      roomCode: room.roomCode,
      phase: room.phase,
      players: room.players.map((player) => ({
        slotIndex: player.slotIndex,
        isOccupied: Boolean(player.playerId),
        isReady: Boolean(player.playerId) && player.ready,
        label: player.slotIndex === 0 ? 'Player 1' : 'Player 2',
        isYou: player.socketId === viewerSocketId,
      })) as LobbyStatePayload['players'],
      occupiedCount,
      allPlayersPresent,
      allReady,
      canStart,
      version: room.version,
      message: this.getLobbyMessage(room),
    };
  }

  private serializeGameState(room: RoomRecord, countdownSecondsRemaining?: 3 | 2 | 1 | 0): GameStatePayload {
    const match = room.match!;
    return {
      roomCode: room.roomCode,
      phase: room.phase === 'game-over' ? 'game-over' : room.phase === 'starting' ? 'starting' : 'in-progress',
      tickNumber: match.tickNumber,
      board: match.board,
      food: match.food,
      snakes: match.snakes.map((snake) => ({
        slotIndex: snake.slotIndex,
        body: snake.body,
        direction: snake.direction,
        alive: snake.alive,
        score: snake.score,
      })) as GameStatePayload['snakes'],
      foodsEaten: match.foodsEaten,
      tickIntervalMs: match.tickIntervalMs,
      countdownSecondsRemaining,
      result: room.phase === 'game-over'
        ? {
            outcome: match.result === 'draw' ? 'draw' : match.winnerSlotIndex === 0 ? 'win' : 'lose',
            winnerSlotIndex: match.winnerSlotIndex,
            deathReasons: match.deathReasons,
          }
        : undefined,
      version: room.version,
    };
  }

  private getLobbyMessage(room: RoomRecord): string {
    if (room.phase === 'starting' && room.countdown) return `Match starts in ${room.countdown.secondsRemaining}…`;
    if (room.phase === 'in-progress') return 'Match in progress.';
    if (room.phase === 'game-over') return 'Round complete. Room will close shortly.';
    return room.players.filter((player) => player.playerId).length === 2
      ? 'Game starts automatically when both players are ready.'
      : 'Waiting for opponent.';
  }

  private canStart(room: RoomRecord): boolean {
    return !room.match && room.players.every((player) => player.playerId && player.connected && player.ready);
  }

  private computePhase(room: RoomRecord): RoomPhase {
    const occupiedCount = room.players.filter((player) => player.playerId).length;
    if (occupiedCount < 2) return 'waiting-for-players';
    return 'lobby';
  }

  private getRoomForSocket(socketId: string): RoomRecord | undefined {
    const roomCode = this.socketToRoom.get(socketId);
    return roomCode ? this.rooms.get(roomCode) : undefined;
  }

  private normalizeRoomCode(roomCode: string): string {
    return roomCode.trim().toUpperCase();
  }

  private isValidRoomCode(roomCode: string): boolean {
    return /^[A-Z]{4,6}$/.test(roomCode);
  }

  private allocatePlayerId(): string {
    return `player-${this.nextPlayerId++}`;
  }

  private generateUniqueRoomCode(): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    do {
      code = Array.from({ length: 4 }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
    } while (this.rooms.has(code));
    return code;
  }

  private error(socketId: string, reason: LobbyErrorReason): ClientEvent {
    const messages: Record<LobbyErrorReason, string> = {
      INVALID_ROOM_CODE: 'Enter a valid room code.',
      ROOM_NOT_FOUND: 'Room no longer exists.',
      ROOM_FULL: 'That room is already full.',
      GAME_ALREADY_STARTED: 'That game has already started.',
      ACTION_NOT_ALLOWED: 'That action is not available right now.',
    };

    return { type: 'room:error', socketId, payload: { reason, message: messages[reason] } };
  }
}
