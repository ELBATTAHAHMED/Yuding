import { apiClient } from '../lib/api-client.ts';
import type {
  AiChatRequestDto,
  AiChatResponseDto,
  ConversationMessageDto,
  ConversationSummaryDto,
  CreateConversationResponse,
} from '../types/ai.types.ts';

export const aiService = {
  /**
   * Creates a new conversation thread for the authenticated user.
   * Routed via API Gateway (/api/ai/conversations).
   */
  async createConversation(title?: string): Promise<CreateConversationResponse> {
    return apiClient.post<CreateConversationResponse>(
      '/api/ai/conversations',
      title ? { title } : {},
      true // requiresAuth
    );
  },

  /**
   * Retrieves conversations belonging to the authenticated user.
   * Strictly verified server-side against IDOR.
   */
  async getConversations(limit: number = 20): Promise<ConversationSummaryDto[]> {
    return apiClient.get<ConversationSummaryDto[]>(
      `/api/ai/conversations?limit=${limit}`,
      true // requiresAuth
    );
  },

  /**
   * Retrieves messages for a specific conversation belonging to the authenticated user.
   * Strictly verified server-side against IDOR.
   */
  async getConversationMessages(conversationId: string): Promise<ConversationMessageDto[]> {
    return apiClient.get<ConversationMessageDto[]>(
      `/api/ai/conversations/${conversationId}/messages`,
      true // requiresAuth
    );
  },

  /**
   * Sends a user prompt to the Yuding V2 AI Assistant.
   * Routed via API Gateway (/api/ai/chat) with RS256 JWT defense-in-depth.
   */
  async sendMessage(request: AiChatRequestDto): Promise<AiChatResponseDto> {
    return apiClient.post<AiChatResponseDto>(
      '/api/ai/chat',
      request,
      true, // requiresAuth
      { timeoutMs: 75000 }
    );
  },
};
