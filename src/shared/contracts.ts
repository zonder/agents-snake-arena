export type RoomPhase = 'waiting-for-players' | 'lobby' | 'starting' | 'in-progress' | 'game-over';
export type Direction = 'up' | 'down' | 'left' | 'right';
export type RoundResult = 'win' | 'lose' | 'draw';
export type DeathReason = 'wall' | 'self' | 'head-to-head' | 'head-to-body' | 'cross-over' | 'disconnect';
export type RematchStatus = 'unavailable' | 'idle' | 'waiting' | 'accepted';

export type LobbyErrorReason =
  | 'INVALID_ROOM_CODE'
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'GAME_ALREADY_STARTED'
  | 'ACTION_NOT_ALLOWED';

export interface GridPoint {
  x: number;
  y: number;
}

export interface RematchView {
  available: boolean;
  status: RematchStatus;
  requestedBySlot: { 0: boolean; 1: boolean };
  requestedByYou: boolean;
  waitingForOtherPlayer: boolean;
  bothAccepted: boolean;
  eligiblePlayerCount: 0 | 1 | 2;
}

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
  rematch: RematchView;
}

export interface PublicSnakeState {
  slotIndex: 0 | 1;
  body: GridPoint[];
  direction: Direction;
  alive: boolean;
  score: number;
}

export interface PublicGameStatePayload {
  roomCode: string;
  phase: 'starting' | 'in-progress' | 'game-over';
  tickNumber: number;
  board: {
    width: 30;
    height: 30;
  };
  food: GridPoint;
  snakes: [PublicSnakeState, PublicSnakeState];
  foodsEaten: number;
  tickIntervalMs: number;
  countdownSecondsRemaining?: 3 | 2 | 1 | 0;
  result?: {
    outcome: RoundResult;
    winnerSlotIndex: 0 | 1 | null;
    deathReasons: Array<{ slotIndex: 0 | 1; reason: DeathReason }>;
  };
  rematch: RematchView;
  version: number;
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

export interface PlayerDirectionSetPayload {
  direction: Direction;
}

export interface GameCountdownPayload {
  roomCode: string;
  phase: 'starting';
  secondsRemaining: 3 | 2 | 1 | 0;
  startsAt: number;
  serverNow: number;
  version: number;
}

export interface GameStartPayload {
  roomCode: string;
  phase: 'in-progress';
  board: {
    width: 30;
    height: 30;
  };
  players: [
    { slotIndex: 0; label: 'Player 1' },
    { slotIndex: 1; label: 'Player 2' }
  ];
  tickIntervalMs: number;
  startedAt: number;
  version: number;
}

export type GameStatePayload = PublicGameStatePayload;

export interface GameEndedPayload {
  roomCode: string;
  phase: 'game-over';
  result: {
    bySlot: {
      0: RoundResult;
      1: RoundResult;
    };
    winnerSlotIndex: 0 | 1 | null;
    deathReasons: Array<{ slotIndex: 0 | 1; reason: DeathReason }>;
  };
  finalState: PublicGameStatePayload;
  teardownAt: number | null;
  version: number;
}

export interface GameRematchStatePayload {
  roomCode: string;
  phase: 'game-over' | 'waiting-for-players' | 'lobby' | 'starting';
  rematch: RematchView;
  version: number;
  message?: string;
}

export interface RoomClosedPayload {
  roomCode: string;
  reason: 'round-complete' | 'player-disconnected';
  version: number;
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
  playerDirectionSet: 'player:direction:set',
  gameCountdown: 'game:countdown',
  gameStart: 'game:start',
  gameState: 'game:state',
  gameEnded: 'game:ended',
  gameRematchRequest: 'game:rematch-request',
  gameRematchState: 'game:rematch-state',
  roomClosed: 'room:closed',
} as const;
