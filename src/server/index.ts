import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
import { Server } from 'socket.io';
import { EVENTS } from '../shared/contracts.js';
import { RoomService, type ClientEvent } from './roomService.js';

const publicDir = join(process.cwd(), 'public');
const roomService = new RoomService();

const mimeTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
};

const httpServer = createServer((req, res) => {
  const urlPath = req.url === '/' ? '/index.html' : req.url || '/index.html';
  const filePath = join(publicDir, urlPath.replace(/^\//, ''));

  if (!filePath.startsWith(publicDir) || !existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  res.writeHead(200, { 'Content-Type': mimeTypes[extname(filePath)] || 'application/octet-stream' });
  res.end(readFileSync(filePath));
});

const io = new Server(httpServer, {
  cors: { origin: '*' },
});

io.on('connection', (socket) => {
  socket.on(EVENTS.roomCreate, () => {
    emitEvents(roomService.createRoom(socket.id).events);
  });

  socket.on(EVENTS.roomJoin, (payload: { roomCode?: string }) => {
    emitEvents(roomService.joinRoom(socket.id, payload?.roomCode ?? '').events);
  });

  socket.on(EVENTS.playerReadySet, (payload: { ready?: boolean }) => {
    if (typeof payload?.ready !== 'boolean') {
      return;
    }
    emitEvents(roomService.setReady(socket.id, payload.ready).events);
  });

  socket.on('disconnect', () => {
    emitEvents(roomService.disconnect(socket.id).events);
  });
});

function emitEvents(events: ClientEvent[]) {
  for (const event of events) {
    io.to(event.socketId).emit(event.type, event.payload);
  }
}

const port = Number(process.env.PORT || 3000);
httpServer.listen(port, () => {
  console.log(`Room lobby server listening on http://localhost:${port}`);
});
