import type {
  GameStartPayload,
  LobbyErrorReason,
  LobbyStatePayload,
  PlayerLeftPayload,
  RoomCreatedPayload,
  RoomJoinedPayload,
  RoomPhase,
} from '../shared/contracts.js';

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
  startNonce: number;
}

export interface ClientEvent {
  type: 'room:created' | 'room:joined' | 'lobby:state' | 'room:error' | 'player:left' | 'game:start';
  socketId: string;
  payload: unknown;
}

export interface ServiceResult {
  events: ClientEvent[];
}

export class RoomService {
  private readonly rooms = new Map<string, RoomRecord>();
  private readonly socketToRoom = new Map<string, string>();
  private readonly socketToPlayer = new Map<string, string>();
  private nextPlayerId = 1;

  createRoom(socketId: string): ServiceResult {
    this.leaveCurrentRoom(socketId, 'left');

    const roomCode = this.generateUniqueRoomCode();
    const playerId = this.allocatePlayerId();
    const room: RoomRecord = {
      roomCode,
      phase: 'waiting-for-players',
      createdAt: Date.now(),
      version: 1,
      startNonce: 0,
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
    if (!this.isValidRoomCode(roomCode)) {
      return { events: [this.error(socketId, 'INVALID_ROOM_CODE')] };
    }

    const room = this.rooms.get(roomCode);
    if (!room) {
      return { events: [this.error(socketId, 'ROOM_NOT_FOUND')] };
    }

    if (room.phase === 'starting' || room.phase === 'in-progress') {
      return { events: [this.error(socketId, 'GAME_ALREADY_STARTED')] };
    }

    const emptySlot = room.players.find((player) => !player.playerId);
    if (!emptySlot) {
      return { events: [this.error(socketId, 'ROOM_FULL')] };
    }

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
        ...this.afterMutation(room),
      ],
    };
  }

  setReady(socketId: string, ready: boolean): ServiceResult {
    const room = this.getRoomForSocket(socketId);
    if (!room || (room.phase !== 'waiting-for-players' && room.phase !== 'lobby')) {
      return { events: [this.error(socketId, 'ACTION_NOT_ALLOWED')] };
    }

    const player = room.players.find((slot) => slot.socketId === socketId);
    if (!player) {
      return { events: [this.error(socketId, 'ACTION_NOT_ALLOWED')] };
    }

    player.ready = ready;
    room.version += 1;
    room.phase = this.computePhase(room);

    return { events: this.afterMutation(room) };
  }

  disconnect(socketId: string): ServiceResult {
    return this.leaveCurrentRoom(socketId, 'disconnected');
  }

  private leaveCurrentRoom(socketId: string, reason: 'left' | 'disconnected'): ServiceResult {
    const roomCode = this.socketToRoom.get(socketId);
    if (!roomCode) {
      return { events: [] };
    }

    const room = this.rooms.get(roomCode);
    this.socketToRoom.delete(socketId);
    this.socketToPlayer.delete(socketId);

    if (!room) {
      return { events: [] };
    }

    const leavingPlayer = room.players.find((slot) => slot.socketId === socketId);
    if (!leavingPlayer) {
      return { events: [] };
    }

    const slotIndex = leavingPlayer.slotIndex;
    leavingPlayer.playerId = null;
    leavingPlayer.socketId = null;
    leavingPlayer.connected = false;
    leavingPlayer.ready = false;

    const remainingPlayers = room.players.filter((slot) => slot.playerId);
    if (remainingPlayers.length === 1) {
      remainingPlayers[0].ready = false;
    }

    if (remainingPlayers.length === 0) {
      this.rooms.delete(roomCode);
      return { events: [] };
    }

    room.version += 1;
    room.phase = 'waiting-for-players';

    const events: ClientEvent[] = remainingPlayers.flatMap((slot) => [
      {
        type: 'player:left',
        socketId: slot.socketId!,
        payload: { roomCode, slotIndex, reason } satisfies PlayerLeftPayload,
      },
    ]);

    events.push(...this.buildLobbyStateEvents(room));
    return { events };
  }

  private afterMutation(room: RoomRecord): ClientEvent[] {
    const events = this.buildLobbyStateEvents(room);

    if (!this.canStart(room)) {
      return events;
    }

    room.startNonce += 1;
    room.phase = 'starting';
    room.version += 1;
    events.push(...this.buildLobbyStateEvents(room));

    if (!this.canStart(room)) {
      room.phase = this.computePhase(room);
      room.version += 1;
      events.push(...this.buildLobbyStateEvents(room));
      return events;
    }

    room.phase = 'in-progress';
    room.version += 1;
    const gameStartPayload: GameStartPayload = {
      roomCode: room.roomCode,
      phase: 'in-progress',
      players: [
        { slotIndex: 0, label: 'Player 1' },
        { slotIndex: 1, label: 'Player 2' },
      ],
    };
    for (const player of room.players) {
      if (player.socketId) {
        events.push({ type: 'game:start', socketId: player.socketId, payload: gameStartPayload });
      }
    }
    return events;
  }

  private buildLobbyStateEvents(room: RoomRecord): ClientEvent[] {
    return room.players.flatMap((player) => {
      if (!player.socketId) return [];
      return [{ type: 'lobby:state' as const, socketId: player.socketId, payload: this.serializeLobbyState(room, player.socketId) }];
    });
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
      message: allPlayersPresent ? 'Game starts automatically when both players are ready.' : 'Waiting for opponent.',
    };
  }

  private canStart(room: RoomRecord): boolean {
    return room.phase !== 'in-progress' && room.players.every((player) => player.playerId && player.connected && player.ready);
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

    return {
      type: 'room:error',
      socketId,
      payload: { reason, message: messages[reason] },
    };
  }
}
