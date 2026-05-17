import type { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import type { SendMessagePayload, TypingPayload, MarkReadPayload, JoinConversationPayload, LeaveConversationPayload } from './chat.types';
import type { JwtPayload } from '../../middlewares/auth';

const onlineUsers = new Map<number, Set<string>>();
const typingTimeouts = new Map<string, NodeJS.Timeout>();

function getRoomKey(conversationId: number) {
  return `conversation_${conversationId}`;
}

function getUserRoomKey(userId: number) {
  return `user_${userId}`;
}

function getUserId(socket: Socket): number | null {
  const data = socket.data as { user?: JwtPayload };
  return data.user?.userId ?? null;
}

function makeTypingKey(socketId: string, conversationId: number): string {
  return `${socketId}::${conversationId}`;
}

function parseTypingKey(key: string): { socketId: string; conversationId: number } | null {
  const idx = key.indexOf('::');
  if (idx === -1) return null;
  const socketId = key.substring(0, idx);
  const conversationId = parseInt(key.substring(idx + 2), 10);
  if (isNaN(conversationId)) return null;
  return { socketId, conversationId };
}

export function registerChatSocketEvents(io: Server) {
  io.on('connection', (socket: Socket) => {
    const userId = getUserId(socket);
    if (!userId) {
      socket.disconnect(true);
      return;
    }

    // Track online status
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId)!.add(socket.id);

    // Join personal room for targeted events
    socket.join(getUserRoomKey(userId));

    // Broadcast online status
    io.emit('chat:online_status', { userId, online: true });

    socket.on('chat:join_conversation', (payload: JoinConversationPayload) => {
      const { conversationId } = payload;
      socket.join(getRoomKey(conversationId));
    });

    socket.on('chat:leave_conversation', (payload: LeaveConversationPayload) => {
      const { conversationId } = payload;
      socket.leave(getRoomKey(conversationId));
      clearTypingTimeout(socket.id, conversationId, userId, io);
    });

    socket.on('chat:send_message', async (payload: SendMessagePayload) => {
      try {
        const { conversationId, type, content } = payload;
        if (!conversationId || !type || !content) {
          socket.emit('chat:error', { message: '参数不完整' });
          return;
        }
        if (!['text', 'image', 'product', 'order'].includes(type)) {
          socket.emit('chat:error', { message: '无效的消息类型' });
          return;
        }
        await ChatService.message.send(conversationId, userId, { type, content });
        // Clear any typing indicator
        clearTypingTimeout(socket.id, conversationId, userId, io);
      } catch (err) {
        socket.emit('chat:error', { message: err instanceof Error ? err.message : '发送消息失败' });
      }
    });

    socket.on('chat:typing', (payload: TypingPayload) => {
      const { conversationId } = payload;
      const timeoutKey = makeTypingKey(socket.id, conversationId);

      // Clear existing timeout
      if (typingTimeouts.has(timeoutKey)) {
        clearTimeout(typingTimeouts.get(timeoutKey)!);
      }

      // Broadcast typing indicator
      io.to(getRoomKey(conversationId)).emit('chat:typing_indicator', { conversationId, userId });

      // Auto-expire after 5 seconds
      const timeout = setTimeout(() => {
        clearTypingTimeout(socket.id, conversationId, userId, io);
      }, 5000);
      typingTimeouts.set(timeoutKey, timeout);
    });

    socket.on('chat:stop_typing', (payload: TypingPayload) => {
      const { conversationId } = payload;
      clearTypingTimeout(socket.id, conversationId, userId, io);
    });

    socket.on('chat:mark_read', async (payload: MarkReadPayload) => {
      try {
        const { conversationId } = payload;
        await ChatService.message.markAsRead(conversationId, userId);
      } catch (err) {
        socket.emit('chat:error', { message: err instanceof Error ? err.message : '标记已读失败' });
      }
    });

    socket.on('disconnect', () => {
      // Remove from online tracking
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          io.emit('chat:online_status', { userId, online: false });
        }
      }

      // Clean up all typing timeouts for this socket
      for (const [key, timeout] of typingTimeouts.entries()) {
        const parsed = parseTypingKey(key);
        if (parsed && parsed.socketId === socket.id) {
          clearTimeout(timeout);
          typingTimeouts.delete(key);
          io.to(getRoomKey(parsed.conversationId)).emit('chat:stop_typing_indicator', {
            conversationId: parsed.conversationId,
            userId,
          });
        }
      }
    });
  });
}

function clearTypingTimeout(socketId: string, conversationId: number, userId: number, io: Server) {
  const timeoutKey = makeTypingKey(socketId, conversationId);
  if (typingTimeouts.has(timeoutKey)) {
    clearTimeout(typingTimeouts.get(timeoutKey)!);
    typingTimeouts.delete(timeoutKey);
    io.to(getRoomKey(conversationId)).emit('chat:stop_typing_indicator', { conversationId, userId });
  }
}
