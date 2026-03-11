export type RoomPhase = 'waiting-for-players' | 'lobby' | 'starting' | 'in-progress';

export type LobbyErrorReason =
  | 'INVALID_ROOM_CODE'
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'GAME_ALREADY_STARTED'
  | 'ACTION_NOT_ALLOWED';

export interface LobbyPlayerView {
  slotIndex: 0 | 1;
  isOccupied: boolean;
  isReady: boolean;
  label: 'Player 1' | 'Player 2';
  isYou: boolean;
}

export interface LobbyStatePayload {
  roomCode: string;
  phase: RoomPhase;
  players: [LobbyPlayerView, LobbyPlayerView];
  occupiedCount: 0 | 1 | 2;
  allPlayersPresent: boolean;
  allReady: boolean;
  canStart: boolean;
  version: number;
  message?: string;
}

export interface RoomCreatedPayload {
  roomCode: string;
  yourSlotIndex: 0;
}

export interface RoomJoinedPayload {
  roomCode: string;
  yourSlotIndex: 0 | 1;
}

export interface RoomErrorPayload {
  reason: LobbyErrorReason;
  message: string;
}

export interface PlayerLeftPayload {
  roomCode: string;
  slotIndex: 0 | 1;
  reason: 'left' | 'disconnected';
}

export interface GameStartPayload {
  roomCode: string;
  phase: 'in-progress';
  players: [
    { slotIndex: 0 | 1; label: 'Player 1' | 'Player 2' },
    { slotIndex: 0 | 1; label: 'Player 1' | 'Player 2' }
  ];
}

export const EVENTS = {
  roomCreate: 'room:create',
  roomCreated: 'room:created',
  roomJoin: 'room:join',
  roomJoined: 'room:joined',
  roomError: 'room:error',
  lobbyState: 'lobby:state',
  playerReadySet: 'player:ready:set',
  playerLeft: 'player:left',
  gameStart: 'game:start',
} as const;
