import type { Server as SocketIOServer } from 'socket.io';

// Use globalThis so the IO instance is shared between the custom server
// (loaded by tsx) and Next.js API routes (bundled by webpack/turbopack).
declare global {
  var _socketIO: SocketIOServer | null;
}

if (!globalThis._socketIO) {
  globalThis._socketIO = null;
}

export function setIO(server: SocketIOServer) {
  globalThis._socketIO = server;
}

export function getIO(): SocketIOServer | null {
  return globalThis._socketIO;
}
