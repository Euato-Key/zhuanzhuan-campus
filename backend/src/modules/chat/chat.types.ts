export type MessageType = 'text' | 'image' | 'product' | 'order';

export interface ProductCardContent {
  productId: string;
  name: string;
  image: string | null;
  price: number;
}

export interface OrderCardContent {
  orderId: string;
  orderNo: string;
  productName: string;
  productImage: string | null;
  status: string;
}

export interface ConversationQuery {
  page?: number;
  pageSize?: number;
}

export interface MessageQuery {
  page?: number;
  pageSize?: number;
  before?: string;
  around?: string;
}

export interface MessageSearchQuery {
  keyword: string;
  page?: number;
  pageSize?: number;
}

export interface SendMessageData {
  type: MessageType;
  content: string;
}

export interface SendMessagePayload {
  conversationId: number;
  type: MessageType;
  content: string;
}

export interface TypingPayload {
  conversationId: number;
}

export interface MarkReadPayload {
  conversationId: number;
}

export interface JoinConversationPayload {
  conversationId: number;
}

export interface LeaveConversationPayload {
  conversationId: number;
}