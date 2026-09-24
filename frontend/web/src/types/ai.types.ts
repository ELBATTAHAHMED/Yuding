export interface AiSourceDto {
  reference: string;
  title: string;
  section?: string;
  category?: string;
}

export interface AiChatRequestDto {
  conversationId: string;
  message: string;
}

export interface AiChatResponseDto {
  conversationId: string;
  messageId: string;
  role: 'assistant' | 'user' | string;
  content: string;
  createdAt: string;
  grounded?: boolean;
  groundingType?: 'NONE' | 'LIVE' | 'RAG' | 'MIXED' | string;
  toolsUsed?: string[];
  sources?: AiSourceDto[];
}

export interface ConversationSummaryDto {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string | null;
}

export interface ConversationMessageDto {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | string;
  content: string;
  grounded?: boolean;
  groundingType?: 'NONE' | 'LIVE' | 'RAG' | 'MIXED' | string;
  toolsUsed?: string[];
  sources?: AiSourceDto[];
  createdAt: string;
}

export interface CreateConversationResponse {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string | null;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  status?: 'sending' | 'delivered' | 'error';
  errorMessage?: string;
  grounded?: boolean;
  groundingType?: 'NONE' | 'LIVE' | 'RAG' | 'MIXED' | string;
  toolsUsed?: string[];
  sources?: AiSourceDto[];
}
