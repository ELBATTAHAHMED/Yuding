import { apiClient } from '../lib/api-client.ts';
import type {
  AiAttachmentDto,
  AiChatRequestDto,
  AiChatResponseDto,
  ConversationMessageDto,
  ConversationSummaryDto,
  CreateConversationResponse,
  TripPlanDto,
  TripPlanRequest,
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

  async deleteConversation(conversationId: string): Promise<void> {
    return apiClient.delete<void>(`/api/ai/conversations/${encodeURIComponent(conversationId)}`, true);
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

  // ----------------- Smart Trip Planner -----------------

  /**
   * Generates a new trip plan snapshot with bounded real provider candidates and BigDecimal budget.
   * Routed via API Gateway (/api/ai/trip-plans).
   */
  async createTripPlan(request: TripPlanRequest): Promise<TripPlanDto> {
    return apiClient.post<TripPlanDto>(
      '/api/ai/trip-plans',
      request,
      true, // requiresAuth
      { timeoutMs: 60000 }
    );
  },

  /**
   * Lists trip plans created by the authenticated user.
   */
  async getUserTripPlans(): Promise<TripPlanDto[]> {
    return apiClient.get<TripPlanDto[]>(
      '/api/ai/trip-plans',
      true // requiresAuth
    );
  },

  /**
   * Retrieves a specific trip plan by public reference (TRP-XXXXXXXX).
   * Verified server-side against IDOR.
   */
  async getTripPlanByReference(reference: string): Promise<TripPlanDto> {
    return apiClient.get<TripPlanDto>(
      `/api/ai/trip-plans/${encodeURIComponent(reference)}`,
      true // requiresAuth
    );
  },

  /**
   * Refreshes real-time pricing and availability snapshot for an existing trip plan.
   */
  async refreshTripPlan(reference: string): Promise<TripPlanDto> {
    return apiClient.post<TripPlanDto>(
      `/api/ai/trip-plans/${encodeURIComponent(reference)}/refresh`,
      {},
      true, // requiresAuth
      { timeoutMs: 60000 }
    );
  },

  // ----------------- Chat Attachments -----------------

  /**
   * Uploads an attachment (Image or Document) for a specific conversation.
   * Sniffed server-side with magic bytes and size limits.
   */
  async uploadAttachment(conversationId: string, file: File): Promise<AiAttachmentDto> {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.postForm<AiAttachmentDto>(
      `/api/ai/conversations/${encodeURIComponent(conversationId)}/attachments`,
      formData,
      true, // requiresAuth
      { timeoutMs: 60000 }
    );
  },

  /**
   * Deletes an attachment belonging to the authenticated user.
   */
  async deleteAttachment(attachmentId: string): Promise<void> {
    return apiClient.delete<void>(
      `/api/ai/attachments/${encodeURIComponent(attachmentId)}`,
      true // requiresAuth
    );
  },

  async getAttachmentContent(attachmentId: string): Promise<Blob> {
    return apiClient.getBlob(`/api/ai/attachments/${encodeURIComponent(attachmentId)}/content`, true);
  },
};
