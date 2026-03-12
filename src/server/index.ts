import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';
import { Server } from 'socket.io';
import { EVENTS, type Direction } from '../shared/contracts.js';
import { normalizePlayerName } from '../shared/playerName.js';
import { RoomService, type ClientEvent } from './roomService.js';

const publicDir = join(process.cwd(), 'public');
const roomService = new RoomService();
const buildInfo = resolveBuildInfo();

const mimeTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
};

const httpServer = createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');

  if (url.pathname === '/build-info.json') {
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
    });
    res.end(JSON.stringify(buildInfo));
    return;
  }

  const urlPath = url.pathname === '/' ? '/index.html' : url.pathname;
  const filePath = join(publicDir, urlPath.replace(/^\//, ''));

  if (!filePath.startsWith(publicDir) || !existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  res.writeHead(200, {
    'Content-Type': mimeTypes[extname(filePath)] || 'application/octet-stream',
    'Cache-Control': urlPath === '/index.html' ? 'no-store, max-age=0' : 'public, max-age=3600',
  });
  res.end(readFileSync(filePath));
});

const io = new Server(httpServer, { cors: { origin: '*' } });
roomService.setEventSink(emitEvents);

io.on('connection', (socket) => {
  socket.on(EVENTS.roomCreate, (payload: { name?: string }) => {
    emitEvents(roomService.createRoom(socket.id, normalizePlayerName(payload?.name ?? '')).events);
  });

  socket.on(EVENTS.roomJoin, (payload: { roomCode?: string; name?: string }) => {
    emitEvents(roomService.joinRoom(socket.id, payload?.roomCode ?? '', normalizePlayerName(payload?.name ?? '')).events);
  });

  socket.on(EVENTS.playerReadySet, (payload: { ready?: boolean }) => {
    if (typeof payload?.ready !== 'boolean') return;
    emitEvents(roomService.setReady(socket.id, payload.ready).events);
  });

  socket.on(EVENTS.playerDirectionSet, (payload: { direction?: Direction }) => {
    if (!payload?.direction || !['up', 'down', 'left', 'right'].includes(payload.direction)) return;
    emitEvents(roomService.setDirection(socket.id, payload.direction));
  });

  socket.on(EVENTS.sessionResume, (payload: { roomCode?: string; reconnectToken?: string }) => {
    if (!payload?.roomCode || !payload?.reconnectToken) return;
    emitEvents(roomService.resumeSession(socket.id, { roomCode: payload.roomCode, reconnectToken: payload.reconnectToken }).events);
  });

  socket.on(EVENTS.gameRematchRequest, () => {
    emitEvents(roomService.requestRematch(socket.id).events);
  });

  socket.on('disconnect', () => {
    emitEvents(roomService.disconnect(socket.id).events);
  });
});

function emitEvents(events: ClientEvent[] | { events: ClientEvent[] }) {
  const list = Array.isArray(events) ? events : events.events;
  for (const event of list) {
    io.to(event.socketId).emit(event.type, event.payload);
  }
}

function resolveBuildInfo() {
  const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as { version?: string };
  const version = packageJson.version || '0.0.0';
  const commit = readGitValue('git rev-parse --short HEAD') || 'unknown';
  const builtAt = process.env.BUILD_TIMESTAMP || new Date().toISOString();

  return {
    version,
    commit,
    builtAt,
    displayVersion: `v${version}+${commit}`,
  };
}

function readGitValue(command: string) {
  try {
    return execSync(command, {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString().trim();
  } catch {
    return '';
  }
}

const port = Number(process.env.PORT || 3000);
httpServer.listen(port, () => {
  console.log(`Room lobby server listening on http://localhost:${port} (${buildInfo.displayVersion})`);
});
