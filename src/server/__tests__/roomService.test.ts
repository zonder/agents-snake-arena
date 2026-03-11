import { describe, expect, test } from 'vitest';
import { RoomService } from '../roomService.js';

function payloads(result: ReturnType<RoomService['createRoom']> | ReturnType<RoomService['joinRoom']> | ReturnType<RoomService['setReady']> | ReturnType<RoomService['disconnect']>, type: string) {
  return result.events.filter((event) => event.type === type).map((event) => event.payload as any);
}

describe('RoomService', () => {
  test('creates a room and sends an authoritative one-player lobby state', () => {
    const service = new RoomService();
    const result = service.createRoom('socket-a');

    const created = payloads(result, 'room:created')[0];
    const lobbyState = payloads(result, 'lobby:state')[0];

    expect(created.roomCode).toMatch(/^[A-Z]{4}$/);
    expect(lobbyState.occupiedCount).toBe(1);
    expect(lobbyState.phase).toBe('waiting-for-players');
    expect(lobbyState.players[0].isOccupied).toBe(true);
    expect(lobbyState.players[1].isOccupied).toBe(false);
  });

  test('joins a room, normalizes lowercase code, and starts only when both become ready', () => {
    const service = new RoomService();
    const created = service.createRoom('socket-a');
    const roomCode = payloads(created, 'room:created')[0].roomCode;

    const joinResult = service.joinRoom('socket-b', roomCode.toLowerCase());
    const joinLobbyStates = payloads(joinResult, 'lobby:state');
    expect(joinLobbyStates).toHaveLength(2);
    expect(joinLobbyStates[0].occupiedCount).toBe(2);
    expect(joinLobbyStates[0].phase).toBe('lobby');

    expect(payloads(service.setReady('socket-a', true), 'game:start')).toHaveLength(0);
    const readyResult = service.setReady('socket-b', true);
    const gameStartEvents = payloads(readyResult, 'game:start');
    expect(gameStartEvents).toHaveLength(2);
    expect(gameStartEvents[0].phase).toBe('in-progress');
  });

  test('rejects invalid code and third-player joins', () => {
    const service = new RoomService();
    expect(payloads(service.joinRoom('socket-a', '12'), 'room:error')[0].reason).toBe('INVALID_ROOM_CODE');

    const roomCode = payloads(service.createRoom('socket-a'), 'room:created')[0].roomCode;
    service.joinRoom('socket-b', roomCode);
    const fullError = payloads(service.joinRoom('socket-c', roomCode), 'room:error')[0];
    expect(fullError.reason).toBe('ROOM_FULL');
  });

  test('resets remaining player readiness when occupancy drops below two', () => {
    const service = new RoomService();
    const roomCode = payloads(service.createRoom('socket-a'), 'room:created')[0].roomCode;
    service.joinRoom('socket-b', roomCode);
    service.setReady('socket-a', true);

    const disconnectResult = service.disconnect('socket-b');
    const lobbyStateForRemainingPlayer = payloads(disconnectResult, 'lobby:state')[0];
    expect(lobbyStateForRemainingPlayer.phase).toBe('waiting-for-players');
    expect(lobbyStateForRemainingPlayer.occupiedCount).toBe(1);
    expect(lobbyStateForRemainingPlayer.players[0].isReady).toBe(false);
    expect(payloads(disconnectResult, 'game:start')).toHaveLength(0);
  });
});
