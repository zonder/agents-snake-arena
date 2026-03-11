import { beforeEach, describe, expect, test, vi } from 'vitest';
import { RoomService } from '../roomService.js';

function payloads(result: { events: Array<{ type: string; payload: unknown }> }, type: string) {
  return result.events.filter((event) => event.type === type).map((event) => event.payload as any);
}

describe('RoomService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-11T22:00:00Z'));
  });

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

  test('starts with a real countdown before emitting game start', () => {
    const emitted: Array<{ type: string; payload: any }> = [];
    const service = new RoomService();
    service.setEventSink((events) => emitted.push(...events));

    const created = service.createRoom('socket-a');
    const roomCode = payloads(created, 'room:created')[0].roomCode;

    service.joinRoom('socket-b', roomCode.toLowerCase());
    expect(payloads(service.setReady('socket-a', true), 'game:start')).toHaveLength(0);

    const readyResult = service.setReady('socket-b', true);
    expect(payloads(readyResult, 'game:start')).toHaveLength(0);
    expect(payloads(readyResult, 'game:countdown')).toHaveLength(2);
    expect(payloads(readyResult, 'game:state')[0].countdownSecondsRemaining).toBe(3);

    vi.advanceTimersByTime(1000);
    expect(emitted.filter((event) => event.type === 'game:countdown')).toHaveLength(2);
    expect(emitted.filter((event) => event.type === 'game:countdown')[0].payload.secondsRemaining).toBe(2);

    vi.advanceTimersByTime(1000);
    expect(emitted.filter((event) => event.type === 'game:countdown')).toHaveLength(4);
    expect(emitted.filter((event) => event.type === 'game:countdown')[2].payload.secondsRemaining).toBe(1);

    vi.advanceTimersByTime(1000);
    const gameStarts = emitted.filter((event) => event.type === 'game:start');
    expect(gameStarts).toHaveLength(2);
    expect(gameStarts[0].payload.phase).toBe('in-progress');
  });

  test('disconnect during gameplay ends the round and closes the room', () => {
    const emitted: Array<{ type: string; payload: any }> = [];
    const service = new RoomService();
    service.setEventSink((events) => emitted.push(...events));

    const roomCode = payloads(service.createRoom('socket-a'), 'room:created')[0].roomCode;
    service.joinRoom('socket-b', roomCode);
    service.setReady('socket-a', true);
    service.setReady('socket-b', true);
    vi.advanceTimersByTime(3000);

    const disconnectResult = service.disconnect('socket-b');
    const ended = payloads(disconnectResult, 'game:ended');
    expect(ended).toHaveLength(1);
    expect(ended[0].result.winnerSlotIndex).toBe(0);
    expect(ended[0].result.bySlot[0]).toBe('win');
    expect(ended[0].result.bySlot[1]).toBe('lose');

    vi.advanceTimersByTime(3000);
    const roomClosed = emitted.filter((event) => event.type === 'room:closed');
    expect(roomClosed).toHaveLength(1);
    expect(roomClosed[0].payload.reason).toBe('player-disconnected');
  });
});
