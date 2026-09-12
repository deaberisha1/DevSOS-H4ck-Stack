let io = null;

function initSocket(server) {
  const { Server } = require('socket.io');
  io = new Server(server, {
    cors: {
      origin: process.env.APP_ORIGIN || 'http://localhost:5173',
      methods: ['GET', 'POST', 'PATCH'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    // Join an event room so broadcasts are scoped per-event
    socket.on('join-event', (eventId) => {
      socket.join(`event:${eventId}`);
    });

    socket.on('leave-event', (eventId) => {
      socket.leave(`event:${eventId}`);
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}

// Broadcast helpers — call these from services after DB writes
function emitRequestUpdate(eventId, payload) {
  if (io) io.to(`event:${eventId}`).emit('request:update', payload);
}

function emitNewRequest(eventId, payload) {
  if (io) io.to(`event:${eventId}`).emit('request:new', payload);
}

function emitStatsUpdate(eventId, stats) {
  if (io) io.to(`event:${eventId}`).emit('stats:update', stats);
}

module.exports = { initSocket, getIO, emitRequestUpdate, emitNewRequest, emitStatsUpdate };
