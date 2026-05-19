import type { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import type { SendMessagePayload, TypingPayload, MarkReadPayload, JoinConversationPayload, LeaveConversationPayload } from './chat.types';
import type { JwtPayload } from '../../middlewares/auth';
import { registerNotificationSocket } from '../notification/notification.socket';

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

function isValidConversationId(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
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

    // Initialize notification socket (push unread count)
    registerNotificationSocket(socket);

    // Send all currently online users to this newly connected socket
    const onlineList: Array<{ userId: number; online: boolean }> = [];
    for (const [uid] of onlineUsers.entries()) {
      onlineList.push({ userId: uid, online: true });
    }
    socket.emit('chat:online_status_batch', onlineList);

    // Broadcast this user's online status to everyone else
    io.emit('chat:online_status', { userId, online: true });

    socket.on('chat:join_conversation', (payload: JoinConversationPayload) => {
      if (!isValidConversationId(payload?.conversationId)) {
        socket.emit('chat:error', { message: '无效的会话ID' });
        return;
      }
      socket.join(getRoomKey(payload.conversationId));
    });

    socket.on('chat:leave_conversation', (payload: LeaveConversationPayload) => {
      if (!isValidConversationId(payload?.conversationId)) {
        return;
      }
      socket.leave(getRoomKey(payload.conversationId));
      clearTypingTimeout(socket.id, payload.conversationId, userId, io);
    });

    socket.on('chat:send_message', async (payload: SendMessagePayload) => {
      try {
        const { conversationId, type, content } = payload;
        if (!isValidConversationId(conversationId)) {
          socket.emit('chat:error', { message: '无效的会话ID' });
          return;
        }
        if (typeof type !== 'string' || !['text', 'image', 'product', 'order'].includes(type)) {
          socket.emit('chat:error', { message: '无效的消息类型' });
          return;
        }
        if (typeof content !== 'string' || !content) {
          socket.emit('chat:error', { message: '消息内容不能为空' });
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
      if (!isValidConversationId(payload?.conversationId)) return;
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
      if (!isValidConversationId(payload?.conversationId)) return;
      clearTypingTimeout(socket.id, payload.conversationId, userId, io);
    });

    socket.on('chat:mark_read', async (payload: MarkReadPayload) => {
      try {
        if (!isValidConversationId(payload?.conversationId)) {
          socket.emit('chat:error', { message: '无效的会话ID' });
          return;
        }
        await ChatService.message.markAsRead(payload.conversationId, userId);
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