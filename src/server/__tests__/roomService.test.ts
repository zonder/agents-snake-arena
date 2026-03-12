import { beforeEach, describe, expect, test, vi } from "vitest";
import { RoomService } from "../roomService.js";

function payloads(
  result: { events: Array<{ type: string; payload: unknown }> },
  type: string,
) {
  return result.events
    .filter((event) => event.type === type)
    .map((event) => event.payload as any);
}

function startGame(service: RoomService, roomCode: string) {
  service.joinRoom("socket-b", roomCode);
  service.setReady("socket-a", true);
  service.setReady("socket-b", true);
  vi.advanceTimersByTime(3000);
}

function finishGame(service: RoomService) {
  for (let step = 0; step < 25; step += 1) {
    const result = service.setDirection("socket-a", "up");
    if (payloads(result, "room:error").length === 0) break;
    vi.advanceTimersByTime(200);
  }
  vi.advanceTimersByTime(3200);
}

describe("RoomService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-11T22:00:00Z"));
  });

  test("creates a room and sends an authoritative one-player lobby state", () => {
    const service = new RoomService();
    const result = service.createRoom("socket-a");

    const created = payloads(result, "room:created")[0];
    const lobbyState = payloads(result, "lobby:state")[0];

    expect(created.roomCode).toMatch(/^[A-Z]{4}$/);
    expect(lobbyState.occupiedCount).toBe(1);
    expect(lobbyState.phase).toBe("waiting-for-players");
    expect(lobbyState.players[0].isOccupied).toBe(true);
    expect(lobbyState.players[1].isOccupied).toBe(false);
  });

  test("starts with a real countdown before emitting game start", () => {
    const emitted: Array<{ type: string; payload: any }> = [];
    const service = new RoomService();
    service.setEventSink((events) => emitted.push(...events));

    const created = service.createRoom("socket-a");
    const roomCode = payloads(created, "room:created")[0].roomCode;

    service.joinRoom("socket-b", roomCode.toLowerCase());
    expect(
      payloads(service.setReady("socket-a", true), "game:start"),
    ).toHaveLength(0);

    const readyResult = service.setReady("socket-b", true);
    expect(payloads(readyResult, "game:start")).toHaveLength(0);
    expect(payloads(readyResult, "game:countdown")).toHaveLength(2);
    expect(
      payloads(readyResult, "game:state")[0].countdownSecondsRemaining,
    ).toBe(3);

    vi.advanceTimersByTime(1000);
    expect(
      emitted.filter((event) => event.type === "game:countdown"),
    ).toHaveLength(2);
    expect(
      emitted.filter((event) => event.type === "game:countdown")[0].payload
        .secondsRemaining,
    ).toBe(2);

    vi.advanceTimersByTime(1000);
    expect(
      emitted.filter((event) => event.type === "game:countdown"),
    ).toHaveLength(4);
    expect(
      emitted.filter((event) => event.type === "game:countdown")[2].payload
        .secondsRemaining,
    ).toBe(1);

    vi.advanceTimersByTime(1000);
    const gameStarts = emitted.filter((event) => event.type === "game:start");
    expect(gameStarts).toHaveLength(2);
    expect(gameStarts[0].payload.phase).toBe("in-progress");
  });

  test("one-player rematch waiting state is authoritative", () => {
    const service = new RoomService();
    const roomCode = payloads(service.createRoom("socket-a"), "room:created")[0]
      .roomCode;
    startGame(service, roomCode);
    finishGame(service);

    const rematchResult = service.requestRematch("socket-a");
    const rematchState = payloads(rematchResult, "game:rematch-state")[0];

    expect(rematchState.phase).toBe("game-over");
    expect(rematchState.rematch.status).toBe("waiting");
    expect(rematchState.rematch.requestedBySlot[0]).toBe(true);
    expect(rematchState.rematch.requestedBySlot[1]).toBe(false);
    expect(rematchState.rematch.waitingForOtherPlayer).toBe(true);
  });

  test("duplicate rematch requests from the same player are a no-op", () => {
    const service = new RoomService();
    const roomCode = payloads(service.createRoom("socket-a"), "room:created")[0]
      .roomCode;
    startGame(service, roomCode);
    finishGame(service);

    const firstAccept = service.requestRematch("socket-a");
    const firstLobbyState = payloads(firstAccept, "lobby:state")[0];
    const firstRematchState = payloads(firstAccept, "game:rematch-state")[0];
    const duplicateAccept = service.requestRematch("socket-a");

    expect(firstLobbyState.version).toBe(firstRematchState.version);
    expect(duplicateAccept.events).toEqual([]);
  });

  test("rematch payload stays viewer-consistent across lobby, game, and rematch events", () => {
    const service = new RoomService();
    const roomCode = payloads(service.createRoom("socket-a"), "room:created")[0]
      .roomCode;
    startGame(service, roomCode);
    finishGame(service);

    const rematchResult = service.requestRematch("socket-a");
    const lobbyStates = rematchResult.events.filter(
      (event) => event.type === "lobby:state",
    ) as Array<{ socketId: string; payload: any }>;
    const gameStates = rematchResult.events.filter(
      (event) => event.type === "game:state",
    ) as Array<{ socketId: string; payload: any }>;
    const rematchStates = rematchResult.events.filter(
      (event) => event.type === "game:rematch-state",
    ) as Array<{ socketId: string; payload: any }>;

    const playerAView = {
      lobby: lobbyStates.find((event) => event.socketId === "socket-a")?.payload
        .rematch,
      game: gameStates.find((event) => event.socketId === "socket-a")?.payload
        .rematch,
      rematch: rematchStates.find((event) => event.socketId === "socket-a")
        ?.payload.rematch,
    };
    const playerBView = {
      lobby: lobbyStates.find((event) => event.socketId === "socket-b")?.payload
        .rematch,
      game: gameStates.find((event) => event.socketId === "socket-b")?.payload
        .rematch,
      rematch: rematchStates.find((event) => event.socketId === "socket-b")
        ?.payload.rematch,
    };

    expect(playerAView.lobby).toEqual(playerAView.game);
    expect(playerAView.game).toEqual(playerAView.rematch);
    expect(playerAView.lobby.requestedByYou).toBe(true);
    expect(playerAView.lobby.waitingForOtherPlayer).toBe(true);

    expect(playerBView.lobby).toEqual(playerBView.game);
    expect(playerBView.game).toEqual(playerBView.rematch);
    expect(playerBView.lobby.requestedByYou).toBe(false);
    expect(playerBView.lobby.waitingForOtherPlayer).toBe(false);
  });

  test("both-player acceptance starts a fresh countdown in the same room with a reset match state", () => {
    const service = new RoomService();
    const roomCode = payloads(service.createRoom("socket-a"), "room:created")[0]
      .roomCode;
    startGame(service, roomCode);
    finishGame(service);

    const firstAccept = service.requestRematch("socket-a");
    const finalStateBefore = payloads(firstAccept, "game:state").at(-1);
    finalStateBefore.snakes[0].score = 9;

    const secondAccept = service.requestRematch("socket-b");
    const countdown = payloads(secondAccept, "game:countdown");
    const gameState = payloads(secondAccept, "game:state").at(-1);

    expect(countdown).toHaveLength(2);
    expect(countdown[0].roomCode).toBe(roomCode);
    expect(gameState.phase).toBe("starting");
    expect(gameState.tickNumber).toBe(0);
    expect(gameState.tickIntervalMs).toBe(200);
    expect(gameState.foodsEaten).toBe(0);
    expect(gameState.snakes[0].score).toBe(0);
    expect(gameState.snakes[1].score).toBe(0);
    expect(gameState.snakes[0].body).toEqual([
      { x: 7, y: 15 },
      { x: 6, y: 15 },
      { x: 5, y: 15 },
    ]);
    expect(gameState.snakes[1].body).toEqual([
      { x: 22, y: 15 },
      { x: 23, y: 15 },
      { x: 24, y: 15 },
    ]);
    expect(gameState.food).not.toBeNull();
  });

  test("post-game disconnect reserves the slot and keeps rematch unavailable", () => {
    const service = new RoomService();
    const roomCode = payloads(service.createRoom("socket-a"), "room:created")[0]
      .roomCode;
    startGame(service, roomCode);
    finishGame(service);
    service.requestRematch("socket-a");

    const leaveResult = service.disconnect("socket-b");
    const lobby = payloads(leaveResult, "lobby:state")[0];
    const rematch = payloads(leaveResult, "game:rematch-state")[0];

    expect(lobby.phase).toBe("game-over");
    expect(lobby.reconnect.active).toBe(true);
    expect(lobby.players[1].isReserved).toBe(true);
    expect(rematch.rematch.available).toBe(false);
    expect(rematch.reconnect.active).toBe(true);
  });

  test("replacement join is blocked while a post-game slot is reserved", () => {
    const service = new RoomService();
    const roomCode = payloads(service.createRoom("socket-a"), "room:created")[0]
      .roomCode;
    startGame(service, roomCode);
    finishGame(service);
    service.disconnect("socket-b");

    const joinResult = service.joinRoom("socket-c", roomCode);
    const error = payloads(joinResult, "room:error")[0];

    expect(error.reason).toBe("ROOM_FULL");
  });

  test("disconnect during gameplay pauses first, then awards forfeit after timeout", () => {
    const emitted: Array<{ type: string; payload: any }> = [];
    const service = new RoomService();
    service.setEventSink((events) => emitted.push(...events));

    const roomCode = payloads(service.createRoom("socket-a"), "room:created")[0]
      .roomCode;
    service.joinRoom("socket-b", roomCode);
    service.setReady("socket-a", true);
    service.setReady("socket-b", true);
    vi.advanceTimersByTime(3000);

    const disconnectResult = service.disconnect("socket-b");
    const pausedState = payloads(disconnectResult, "game:state")[0];
    expect(pausedState.paused).toBe(true);
    expect(pausedState.reconnect.active).toBe(true);

    vi.advanceTimersByTime(30000);
    const ended = emitted.filter((event) => event.type === "game:ended").map((event) => event.payload as any);
    expect(ended).toHaveLength(1);
    expect(ended[0].result.winnerSlotIndex).toBe(0);
    expect(ended[0].result.bySlot[0]).toBe("win");
    expect(ended[0].result.bySlot[1]).toBe("lose");
  });

  test("resume succeeds during lobby and restores the same slot", () => {
    const service = new RoomService();
    const created = service.createRoom("socket-a");
    const roomCode = payloads(created, "room:created")[0].roomCode;
    const hostSession = payloads(created, "session:issued")[0];
    service.joinRoom("socket-b", roomCode);
    const disconnectResult = service.disconnect("socket-a");
    expect(payloads(disconnectResult, "lobby:state")[0].reconnect.active).toBe(true);

    const resumeResult = service.resumeSession("socket-a-2", { roomCode, reconnectToken: hostSession.reconnectToken });
    const resumed = payloads(resumeResult, "session:resume:succeeded")[0];
    const lobby = payloads(resumeResult, "lobby:state")[0];
    expect(resumed.slotIndex).toBe(0);
    expect(lobby.yourSlotIndex).toBe(0);
    expect(lobby.reconnect.active).toBe(false);
  });

  test("resume during gameplay starts a server-driven resume countdown", () => {
    const service = new RoomService();
    const created = service.createRoom("socket-a");
    const roomCode = payloads(created, "room:created")[0].roomCode;
    const joined = service.joinRoom("socket-b", roomCode);
    const guestSession = payloads(joined, "session:issued")[0];
    service.setReady("socket-a", true);
    service.setReady("socket-b", true);
    vi.advanceTimersByTime(3000);

    const disconnectResult = service.disconnect("socket-b");
    expect(payloads(disconnectResult, "game:state")[0].paused).toBe(true);

    const resumeResult = service.resumeSession("socket-b-2", { roomCode, reconnectToken: guestSession.reconnectToken });
    expect(payloads(resumeResult, "session:resume:succeeded")[0].slotIndex).toBe(1);
    const countdowns = payloads(resumeResult, "game:countdown");
    expect(countdowns).toHaveLength(2);
    expect(countdowns[0].secondsRemaining).toBe(3);
    const gameStates = payloads(resumeResult, "game:state");
    expect(gameStates[0].reconnect.status).toBe("resume-countdown");
  });
});
