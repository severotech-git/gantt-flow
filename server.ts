import { createServer } from 'node:http';
import { parse } from 'node:url';
import next from 'next';
import { Server as SocketServer } from 'socket.io';
import { socketAuthMiddleware } from './src/lib/socketAuth.js';
import { setIO } from './src/lib/socketServer.js';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
  PresenceUser,
} from './src/lib/socketEvents.js';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME ?? '0.0.0.0';
const port = parseInt(process.env.PORT ?? '3000', 10);

// ─── In-memory presence ──────────────────────────────────────────────────────

interface RoomUser extends PresenceUser {
  socketId: string;
}

const rooms = new Map<string, Map<string, RoomUser>>(); // roomId → userId → RoomUser

// Project → accountId cache (5-min TTL)
const projectAccountCache = new Map<string, { accountId: string; expiresAt: number }>();

async function getProjectAccountId(projectId: string): Promise<string | null> {
  const cached = projectAccountCache.get(projectId);
  if (cached && cached.expiresAt > Date.now()) return cached.accountId;

  try {
    // Dynamic import to avoid loading Mongoose at module level
    const { connectDB } = await import('./src/lib/mongodb.js');
    const Project = (await import('./src/lib/models/Project.js')).default;
    await connectDB();
    const project = await Project.findById(projectId, { accountId: 1 }).lean();
    if (!project) return null;
    const accountId = (project as { accountId: { toString(): string } }).accountId.toString();
    projectAccountCache.set(projectId, { accountId, expiresAt: Date.now() + 5 * 60_000 });
    return accountId;
  } catch {
    return null;
  }
}

// Deterministic color from user ID
const PRESENCE_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
];

function colorForUser(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return PRESENCE_COLORS[Math.abs(hash) % PRESENCE_COLORS.length];
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────

async function main() {
  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();

  await app.prepare();

  // ─── HTTP + Socket.IO ──────────────────────────────────────────────────────

  const httpServer = createServer((req, res) => {
    handle(req, res, parse(req.url!, true));
  });

  const io = new SocketServer<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(httpServer, {
    transports: ['websocket', 'polling'],
    cors: {
      origin: dev ? 'http://localhost:3000' : undefined,
      credentials: true,
    },
  });

  // Store io instance for use in API routes
  setIO(io);

  // ─── Auth middleware ─────────────────────────────────────────────────────

  io.use(socketAuthMiddleware);

  // ─── Helpers ─────────────────────────────────────────────────────────────

  function broadcastPresence(roomId: string) {
    const room = rooms.get(roomId);
    if (!room) return;
    const users: PresenceUser[] = [...room.values()].map(({ userId, name, color }) => ({
      userId,
      name,
      color,
    }));
    io.to(roomId).emit('presence-update', { users });
  }

  // ─── Socket.IO event handlers ────────────────────────────────────────────

  io.on('connection', (socket) => {
    const { userId, accountId, name } = socket.data;
    let currentRoom: string | null = null;

    // Auto-join user's personal notification room (independent of project)
    socket.join(`user:${userId}`);

    // ── Join project room ────────────────────────────────────────────────────

    socket.on('join-project', async ({ projectId }) => {
      // Leave previous room if any
      if (currentRoom) {
        socket.leave(currentRoom);
        const room = rooms.get(currentRoom);
        if (room) {
          room.delete(userId);
          if (room.size === 0) rooms.delete(currentRoom);
          else broadcastPresence(currentRoom);
        }
      }

      // Verify the user's account owns this project
      const projectAccountId = await getProjectAccountId(projectId);
      if (!projectAccountId || projectAccountId !== accountId) {
        socket.emit('presence-update', { users: [] });
        return;
      }

      const roomId = `project:${projectId}`;
      currentRoom = roomId;
      socket.join(roomId);

      if (!rooms.has(roomId)) rooms.set(roomId, new Map());
      rooms.get(roomId)!.set(userId, {
        userId,
        name,
        color: colorForUser(userId),
        socketId: socket.id,
      });

      broadcastPresence(roomId);
    });

    // ── Leave project room ──────────────────────────────────────────────────

    socket.on('leave-project', () => {
      if (!currentRoom) return;
      socket.leave(currentRoom);
      const room = rooms.get(currentRoom);
      if (room) {
        room.delete(userId);
        if (room.size === 0) rooms.delete(currentRoom);
        else broadcastPresence(currentRoom);
      }
      io.to(currentRoom).emit('remote-cursor-hide', { userId });
      currentRoom = null;
    });

    // ── Cursor ───────────────────────────────────────────────────────────────

    socket.on('cursor-move', ({ projectId, ...cursor }) => {
      const roomId = `project:${projectId}`;
      socket.to(roomId).emit('remote-cursor', { userId, ...cursor });
    });

    socket.on('cursor-hide', ({ projectId }) => {
      const roomId = `project:${projectId}`;
      socket.to(roomId).emit('remote-cursor-hide', { userId });
    });

    // ── Remote actions (data sync) ───────────────────────────────────────────

    socket.on('remote-action', ({ projectId, action }) => {
      const roomId = `project:${projectId}`;
      socket.to(roomId).emit('remote-action', { userId, action });
    });

    // ── Drag streaming ──────────────────────────────────────────────────────

    socket.on('drag-start', ({ projectId, dragId, barData, pxPerDay }) => {
      const roomId = `project:${projectId}`;
      socket.to(roomId).emit('drag-start', { userId, dragId, barData, pxPerDay });
    });

    socket.on('drag-move', ({ projectId, dragId, deltaX }) => {
      const roomId = `project:${projectId}`;
      socket.to(roomId).emit('drag-move', { userId, dragId, deltaX });
    });

    socket.on('drag-end', ({ projectId, dragId }) => {
      const roomId = `project:${projectId}`;
      socket.to(roomId).emit('drag-end', { userId, dragId });
    });

    // ── Disconnect ───────────────────────────────────────────────────────────

    socket.on('disconnect', () => {
      if (!currentRoom) return;
      const room = rooms.get(currentRoom);
      if (room) {
        room.delete(userId);
        if (room.size === 0) rooms.delete(currentRoom);
        else broadcastPresence(currentRoom);
      }
      io.to(currentRoom).emit('remote-cursor-hide', { userId });
    });
  });

  // ─── Start ─────────────────────────────────────────────────────────────────

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port} (${dev ? 'dev' : 'production'})`);
    console.log(`> Socket.IO attached`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
