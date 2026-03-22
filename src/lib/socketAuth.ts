import type { Socket } from 'socket.io';
import type { SocketData } from './socketEvents';
import { decode } from '@auth/core/jwt';

/**
 * Parse a specific cookie value from a raw Cookie header string.
 */
function parseCookie(cookieHeader: string, name: string): string | undefined {
  const match = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(name + '='));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : undefined;
}

/**
 * Socket.IO middleware that authenticates via the NextAuth JWT cookie.
 * Attaches { userId, accountId, name, email } to socket.data.
 */
export async function socketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void
): Promise<void> {
  try {
    const cookieHeader = socket.handshake.headers.cookie;
    if (!cookieHeader) {
      return next(new Error('No cookies'));
    }

    // Same cookie resolution as src/proxy.ts
    const token =
      parseCookie(cookieHeader, '__Secure-authjs.session-token') ??
      parseCookie(cookieHeader, 'authjs.session-token');

    if (!token) {
      return next(new Error('No session cookie'));
    }

    const secret = process.env.AUTH_SECRET;
    if (!secret) {
      return next(new Error('AUTH_SECRET not configured'));
    }

    const decoded = await decode({
      token,
      secret,
      salt: cookieHeader.includes('__Secure-authjs.session-token')
        ? '__Secure-authjs.session-token'
        : 'authjs.session-token',
    });

    if (!decoded || !decoded.uid) {
      return next(new Error('Invalid token'));
    }

    const data = socket.data as SocketData;
    data.userId = decoded.uid as string;
    data.accountId = (decoded.activeAccountId as string) ?? '';
    data.name = (decoded.name as string) ?? '';
    data.email = (decoded.email as string) ?? '';

    next();
  } catch {
    next(new Error('Authentication failed'));
  }
}
