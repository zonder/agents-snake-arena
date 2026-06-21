export type RoomPhase = 'waiting-for-players' | 'lobby' | 'starting' | 'in-progress' | 'game-over';
export type RoomMode = 'versus' | 'solo' | 'co-op';
export type Direction = 'up' | 'down' | 'left' | 'right';
export type RoundResult = 'win' | 'lose' | 'draw';
export type DeathReason = 'wall' | 'self' | 'head-to-head' | 'head-to-body' | 'cross-over' | 'disconnect' | 'hazard' | 'monster';
export type RematchStatus = 'unavailable' | 'idle' | 'waiting' | 'accepted';
export type ReconnectStatus = 'none' | 'waiting-for-player' | 'resume-countdown';

export const PLAYER_NAME_MAX_LENGTH = 12;
export const PLAYER_NAME_STORAGE_KEY = 'snake:player-name';

export type PlayerNameValidationReason = 'REQUIRED' | 'TOO_LONG' | 'EMOJI_NOT_ALLOWED';

export interface PlayerNameValidationResult {
  valid: boolean;
  normalized: string;
  reason?: PlayerNameValidationReason;
  message?: string;
}

export type LobbyErrorReason =
  | 'INVALID_ROOM_CODE'
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'GAME_ALREADY_STARTED'
  | 'ACTION_NOT_ALLOWED'
  | 'INVALID_PLAYER_NAME';

export interface GridPoint { x: number; y: number; }

export interface PlayerIdentityView {
  slotIndex: 0 | 1;
  label: 'Player 1' | 'Player 2';
  name: string | null;
  displayName: string;
}

export interface ReconnectView {
  active: boolean;
  status: ReconnectStatus;
  disconnectedSlotIndex: 0 | 1 | null;
  disconnectedPlayerName?: string | null;
  disconnectedPlayerDisplayName?: string | null;
  reservedUntil: number | null;
  secondsRemaining: number | null;
  affectedPhase: RoomPhase | null;
  yourSlotReserved: boolean;
  canAutoResume: boolean;
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

export interface LobbyPlayerView extends PlayerIdentityView {
  isOccupied: boolean;
  isReady: boolean;
  isConnected: boolean;
  isReserved: boolean;
  isYou: boolean;
}

export interface LobbyStatePayload {
  roomCode: string;
  roomMode: RoomMode;
  phase: RoomPhase;
  yourSlotIndex: 0 | 1 | null;
  players: [LobbyPlayerView, LobbyPlayerView];
  occupiedCount: 0 | 1 | 2;
  allPlayersPresent: boolean;
  allReady: boolean;
  canStart: boolean;
  soloMode: boolean;
  version: number;
  message?: string;
  rematch: RematchView;
  reconnect: ReconnectView;
}

export interface PublicSnakeState {
  slotIndex: 0 | 1;
  body: GridPoint[];
  direction: Direction;
  alive: boolean;
  score: number;
}

export type SwitchActivationType = 'hold' | 'toggle';
export type HazardType = 'spike' | 'sweeper';
export type HazardPhase = 'warning' | 'active' | 'cooldown';

export interface PuzzleSwitchView {
  id: string;
  position: GridPoint;
  activationType: SwitchActivationType;
  active: boolean;
}

export interface PuzzleDoorView {
  id: string;
  position: GridPoint;
  open: boolean;
  requiresSwitches: string[];
}

export interface HazardView {
  id: string;
  hazardType: HazardType;
  /** Current position (spike: fixed tile, sweeper: current path node). */
  position: GridPoint;
  /** Current telegraph phase. */
  phase: HazardPhase;
  /** True when the hazard kills on contact this tick. */
  lethal: boolean;
  /** Ticks remaining in current phase (client countdown display). */
  ticksRemainingInPhase: number;
  /** Sweeper only: full path waypoints. */
  path?: GridPoint[];
  /** Sweeper only: current index into path. */
  pathIndex?: number;
}

export interface CoOpStatePayload {
  layoutId: string;
  objective: 'both-reach-exit';
  exit: GridPoint;
  walls: GridPoint[];
  playersAtExit: { 0: boolean; 1: boolean };
  switches: PuzzleSwitchView[];
  doors: PuzzleDoorView[];
  hazards: HazardView[];
  monsters?: PatrolMonsterView[];
}

export interface PatrolMonsterView {
  id: string;
  position: GridPoint;
  /** Ordered path waypoints for client rendering. */
  path: GridPoint[];
  /** Current index into path. */
  pathIndex: number;
}

export interface PublicGameStatePayload {
  roomCode: string;
  roomMode: RoomMode;
  phase: 'starting' | 'in-progress' | 'game-over';
  yourSlotIndex: 0 | 1 | null;
  tickNumber: number;
  board: { width: 30; height: 30 };
  food: GridPoint | null;
  snakes: [PublicSnakeState, PublicSnakeState];
  players: [PlayerIdentityView, PlayerIdentityView];
  foodsEaten: number;
  tickIntervalMs: number;
  countdownSecondsRemaining?: 3 | 2 | 1 | 0;
  paused?: boolean;
  reconnect: ReconnectView;
  result?: { outcome: RoundResult; winnerSlotIndex: 0 | 1 | null; deathReasons: Array<{ slotIndex: 0 | 1; reason: DeathReason }> };
  rematch: RematchView;
  version: number;
  coOp?: CoOpStatePayload;
}

export interface PlayerSessionPayload {
  roomCode: string;
  roomMode: RoomMode;
  slotIndex: 0 | 1;
  reconnectToken: string;
  issuedAt: number;
  version: number;
}

export interface SessionResumeRequestPayload { roomCode: string; reconnectToken: string; }
export interface SessionResumeSucceededPayload { roomCode: string; slotIndex: 0 | 1; phase: RoomPhase; resumedAt: number; version: number; }
export interface SessionResumeFailedPayload {
  roomCode: string;
  reason: 'ROOM_NOT_FOUND' | 'RESERVATION_EXPIRED' | 'TOKEN_MISMATCH' | 'SLOT_NOT_RESERVED' | 'SLOT_ALREADY_ACTIVE';
  message: string;
}

export interface RoomCreateRequestPayload { name?: string; mode?: Exclude<RoomMode, 'solo'>; }
export interface RoomJoinRequestPayload { roomCode?: string; name?: string; }

export interface RoomCreatedPayload { roomCode: string; roomMode: RoomMode; yourSlotIndex: 0; }
export interface RoomJoinedPayload { roomCode: string; roomMode: RoomMode; yourSlotIndex: 0 | 1; }
export interface RoomErrorPayload { reason: LobbyErrorReason; message: string; }
export interface PlayerLeftPayload { roomCode: string; slotIndex: 0 | 1; reason: 'left' | 'disconnected'; }
export interface PlayerDirectionSetPayload { direction: Direction; }
export interface GameCountdownPayload { roomCode: string; phase: 'starting'; secondsRemaining: 3 | 2 | 1 | 0; startsAt: number; serverNow: number; version: number; }

export interface GameStartPayload {
  roomCode: string;
  roomMode: RoomMode;
  phase: 'in-progress';
  board: { width: 30; height: 30 };
  players: [PlayerIdentityView & { name: string }, PlayerIdentityView & { name: string }];
  tickIntervalMs: number;
  startedAt: number;
  version: number;
  coOp?: CoOpStatePayload;
}

export type GameStatePayload = PublicGameStatePayload;

export interface GameEndedPayload {
  roomCode: string;
  phase: 'game-over';
  result: { bySlot: { 0: RoundResult; 1: RoundResult }; winnerSlotIndex: 0 | 1 | null; deathReasons: Array<{ slotIndex: 0 | 1; reason: DeathReason }> };
  finalState: PublicGameStatePayload;
  teardownAt: number | null;
  version: number;
}

export interface GameRematchStatePayload {
  roomCode: string;
  roomMode: RoomMode;
  phase: 'game-over' | 'waiting-for-players' | 'lobby' | 'starting';
  players: [PlayerIdentityView, PlayerIdentityView];
  rematch: RematchView;
  reconnect: ReconnectView;
  yourSlotIndex: 0 | 1 | null;
  version: number;
  message?: string;
}

export interface RoomClosedPayload { roomCode: string; reason: 'round-complete' | 'player-disconnected'; version: number; }

export const EVENTS = {
  roomCreate: 'room:create', roomCreateSolo: 'room:create-solo', roomCreated: 'room:created', roomJoin: 'room:join', roomJoined: 'room:joined', roomError: 'room:error',
  lobbyState: 'lobby:state', playerReadySet: 'player:ready:set', playerLeft: 'player:left', playerDirectionSet: 'player:direction:set',
  gameCountdown: 'game:countdown', gameStart: 'game:start', gameState: 'game:state', gameEnded: 'game:ended', gameRematchRequest: 'game:rematch-request',
  gameRematchState: 'game:rematch-state', roomClosed: 'room:closed', sessionIssued: 'session:issued', sessionResume: 'session:resume',
  sessionResumeSucceeded: 'session:resume:succeeded', sessionResumeFailed: 'session:resume:failed',
} as const;
