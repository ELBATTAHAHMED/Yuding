import { apiClient } from '../lib/api-client.ts';
import type { AiChatRequestDto, AiChatResponseDto } from '../types/ai.types.ts';

export const aiService = {
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
