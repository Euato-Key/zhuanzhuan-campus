import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from './env';
import type { JwtPayload } from '../middlewares/auth';

let io: Server;

export function initSocketServer(httpServer: import('http').Server): Server {
  io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_ORIGIN,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication failed'));
    }
    try {
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
      socket.data.user = payload;
      next();
    } catch {
      next(new Error('Authentication failed'));
    }
  });

  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
}