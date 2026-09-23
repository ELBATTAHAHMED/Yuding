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
  toolsUsed?: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  status?: 'sending' | 'delivered' | 'error';
  errorMessage?: string;
  grounded?: boolean;
  toolsUsed?: string[];
}
