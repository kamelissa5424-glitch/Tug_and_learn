const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: true, methods: ['GET', 'POST'] }
});

const PORT = process.env.PORT || 3000;
const rooms = new Map();
const ROOM_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (_req, res) => res.json({ ok: true, service: 'Tug & Learn' }));
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

function makeRoomCode() {
  let code;
  do {
    code = 'TUG-' + Array.from({ length: 4 }, () => ROOM_CHARS[Math.floor(Math.random() * ROOM_CHARS.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function roomForSocket(socket) {
  const code = socket.data.roomCode;
  return code ? rooms.get(code) : null;
}

function broadcastState(room) {
  io.to(room.code).emit('score_update', {
    blue: room.blue,
    red: room.red,
    finished: room.finished,
    winner: room.winner || null
  });
}

function leaveRoom(socket) {
  const code = socket.data.roomCode;
  if (!code) return;
  const room = rooms.get(code);
  socket.leave(code);
  socket.data.roomCode = null;
  socket.data.team = null;
  if (!room) return;

  if (room.blueSocket === socket.id) room.blueSocket = null;
  if (room.redSocket === socket.id) room.redSocket = null;

  io.to(code).emit('opponent_left');

  // Keep a room only while at least one player remains. This prevents stale rooms.
  if (!room.blueSocket && !room.redSocket) rooms.delete(code);
}

io.on('connection', socket => {
  socket.on('create_room', ({ game, level }) => {
    leaveRoom(socket);
    const code = makeRoomCode();
    const room = {
      code,
      game: typeof game === 'string' ? game : 'letters',
      level: Number(level) || 1,
      blue: 0,
      red: 0,
      blueSocket: socket.id,
      redSocket: null,
      started: false,
      finished: false,
      winner: null
    };
    rooms.set(code, room);
    socket.join(code);
    socket.data.roomCode = code;
    socket.data.team = 'blue';
    socket.emit('room_created', { code, game: room.game, level: room.level });
  });

  socket.on('join_room', ({ code }) => {
    const normalized = String(code || '').trim().toUpperCase();
    const room = rooms.get(normalized);
    if (!room) return socket.emit('server_error', { message: 'Room not found. Check the code and try again.' });
    if (room.redSocket) return socket.emit('server_error', { message: 'That room already has two players.' });
    if (room.finished) return socket.emit('server_error', { message: 'That game has already finished. Create a new room.' });

    leaveRoom(socket);
    room.redSocket = socket.id;
    socket.join(normalized);
    socket.data.roomCode = normalized;
    socket.data.team = 'red';
    socket.emit('room_joined', { code: normalized, game: room.game, level: room.level });
    io.to(room.blueSocket).emit('opponent_joined');
  });

  socket.on('start_game', ({ code, game, level }) => {
    const room = rooms.get(String(code || '').toUpperCase());
    if (!room || socket.id !== room.blueSocket || !room.redSocket) return;
    room.game = typeof game === 'string' ? game : room.game;
    room.level = Number(level) || room.level;
    room.blue = 0;
    room.red = 0;
    room.started = true;
    room.finished = false;
    room.winner = null;
    io.to(room.code).emit('game_started', { game: room.game, level: room.level });
    broadcastState(room);
  });

  socket.on('answer', ({ code, team, correct }) => {
    const room = rooms.get(String(code || '').toUpperCase());
    if (!room || !room.started || room.finished) return;
    if (socket.id !== (team === 'blue' ? room.blueSocket : room.redSocket)) return;
    if (!correct) return;

    if (team === 'blue') room.blue += 1;
    else if (team === 'red') room.red += 1;
    else return;

    const lead = Math.abs(room.blue - room.red);
    if (lead >= 5) {
      room.finished = true;
      room.winner = room.blue > room.red ? 'Blue' : 'Red';
    }
    broadcastState(room);
  });

  socket.on('disconnect', () => leaveRoom(socket));
});

server.listen(PORT, () => {
  console.log(`Tug & Learn running on port ${PORT}`);
});
