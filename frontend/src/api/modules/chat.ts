import api from '../index'

// ─── Types ───

export type MessageType = 'text' | 'image' | 'product' | 'order'

export interface ChatUser {
  id: number
  username: string
  avatar: string | null
  school: string | null
  campus: string | null
}

export interface LastMessage {
  id: string
  type: MessageType
  content: string
  createdAt: string
  senderId: number
}

export interface ConversationListItem {
  id: number
  otherUser: ChatUser
  lastMessage: LastMessage | null
  unreadCount: number
  updatedAt: string
}

export interface ConversationDetail {
  id: number
  otherUser: ChatUser
  lastMessage: LastMessage | null
  unreadCount: number
  createdAt: string
  updatedAt: string
}

export interface MessageItem {
  id: string
  conversationId: number
  senderId: number
  type: MessageType
  content: string
  readAt: string | null
  createdAt: string
  sender: ChatUser
}

export interface ProductCardContent {
  productId: string
  name: string
  image: string | null
  price: number
}

export interface OrderCardContent {
  orderId: string
  orderNo: string
  productName: string
  productImage: string | null
  status: string
}

export interface BlacklistItem {
  id: number
  blockedUser: ChatUser
  createdAt: string
}

export interface QuickReplyItem {
  id: number
  userId: number
  content: string
  sort: number
  createdAt: string
}

export interface BargainTemplate {
  template: string
  product: {
    id: string
    name: string
    currentPrice: number
    bargain: boolean
  }
}

export interface BlockStatus {
  isBlocked: boolean
  blockedByMe: boolean
  blockedByOther: boolean
}

export interface PaginatedResponse<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ─── Conversations ───

export function getConversations(params?: { page?: number; pageSize?: number }) {
  return api.get<{ code: number; data: PaginatedResponse<ConversationListItem>; message: string }>(
    '/chat/conversations',
    { params }
  )
}

export function createConversation(targetUserId: number) {
  return api.post<{ code: number; data: ConversationDetail; message: string }>(
    '/chat/conversations',
    { targetUserId }
  )
}

export function getConversation(id: number) {
  return api.get<{ code: number; data: ConversationDetail; message: string }>(
    `/chat/conversations/${id}`
  )
}

// ─── Messages ───

export function getMessages(
  conversationId: number,
  params?: { page?: number; pageSize?: number; before?: string; around?: string }
) {
  return api.get<{ code: number; data: PaginatedResponse<MessageItem>; message: string }>(
    `/chat/conversations/${conversationId}/messages`,
    { params }
  )
}

export function sendMessage(
  conversationId: number,
  data: { type: MessageType; content: string }
) {
  return api.post<{ code: number; data: MessageItem; message: string }>(
    `/chat/conversations/${conversationId}/messages`,
    data
  )
}

export function markAsRead(conversationId: number) {
  return api.put<{ code: number; data: { readCount: number }; message: string }>(
    `/chat/conversations/${conversationId}/messages/read`
  )
}

export function searchMessages(
  conversationId: number,
  params: {
    keyword?: string
    type?: MessageType
    senderId?: number
    startDate?: string
    endDate?: string
    page?: number
    pageSize?: number
  }
) {
  return api.get<{ code: number; data: PaginatedResponse<MessageItem>; message: string }>(
    `/chat/conversations/${conversationId}/messages/search`,
    { params }
  )
}

// ─── Blacklist ───

export function getBlacklist(params?: { page?: number; pageSize?: number }) {
  return api.get<{ code: number; data: PaginatedResponse<BlacklistItem>; message: string }>(
    '/chat/blacklist',
    { params }
  )
}

export function blockUser(blockedUserId: number) {
  return api.post<{ code: number; data: BlacklistItem; message: string }>(
    '/chat/blacklist',
    { blockedUserId }
  )
}

export function unblockUser(blockedUserId: number) {
  return api.delete<{ code: number; data: { message: string }; message: string }>(
    `/chat/blacklist/${blockedUserId}`
  )
}

export function checkBlockStatus(userId: number) {
  return api.get<{ code: number; data: BlockStatus; message: string }>(
    '/chat/blacklist/check',
    { params: { userId } }
  )
}

// ─── Quick Replies ───

export function getQuickReplies() {
  return api.get<{ code: number; data: QuickReplyItem[]; message: string }>(
    '/chat/quick-replies'
  )
}

export function createQuickReply(data: { content: string; sort?: number }) {
  return api.post<{ code: number; data: QuickReplyItem; message: string }>(
    '/chat/quick-replies',
    data
  )
}

export function updateQuickReply(id: number, data: { content?: string; sort?: number }) {
  return api.put<{ code: number; data: QuickReplyItem; message: string }>(
    `/chat/quick-replies/${id}`,
    data
  )
}

export function deleteQuickReply(id: number) {
  return api.delete<{ code: number; data: null; message: string }>(
    `/chat/quick-replies/${id}`
  )
}

export function batchUpdateSort(items: Array<{ id: number; sort: number }>) {
  return api.put<{ code: number; data: { message: string }; message: string }>(
    '/chat/quick-replies/sort',
    { items }
  )
}

// ─── Bargain Template ───

export function getBargainTemplate(productId: string) {
  return api.get<{ code: number; data: BargainTemplate; message: string }>(
    `/chat/bargain-template/${productId}`
  )
}