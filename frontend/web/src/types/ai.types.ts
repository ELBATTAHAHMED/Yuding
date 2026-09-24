export interface AiSourceDto {
  reference: string;
  title: string;
  section?: string;
  category?: string;
}

export interface AiAttachmentDto {
  id: string;
  publicReference: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  kind: 'IMAGE' | 'DOCUMENT' | string;
  status: string;
  createdAt: string;
}

export interface AiChatRequestDto {
  conversationId: string;
  message: string;
  attachmentIds?: string[];
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
  userAttachments?: AiAttachmentDto[];
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
  attachments?: AiAttachmentDto[];
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
  attachments?: AiAttachmentDto[];
}

// ----------------- Trip Planner Types -----------------

export interface TripPlanItemDto {
  id?: string;
  type: 'FLIGHT' | 'HOTEL' | 'ACTIVITY' | 'TRANSFER' | string;
  title: string;
  provider?: string;
  offerReference?: string;
  startTime?: string;
  endTime?: string;
  price?: number | null;
  currency?: string;
  priceInBudgetCurrency?: number | null;
  isPriced?: boolean;
  dayNumber?: number | null;
  slot?: string;
  detailsJson?: string;
}

export interface TripPlanDayDto {
  id?: string;
  dayNumber: number;
  date: string;
  theme: string;
  weatherForecast?: string;
  estimatedCost: number;
  morning: TripPlanItemDto[];
  afternoon: TripPlanItemDto[];
  evening: TripPlanItemDto[];
}

export interface TripPlanDto {
  reference: string;
  title: string;
  summary: string;
  origin: string;
  destination: string;
  startDate: string;
  endDate: string;
  travelers: number;
  budget: number;
  budgetCurrency: string;
  pricedTotal: number;
  remainingBudget: number;
  unpricedItemsCount: number;
  budgetStatus: 'WITHIN_BUDGET' | 'OVER_BUDGET' | 'PARTIALLY_PRICED' | string;
  dataFreshness: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  flight?: TripPlanItemDto | null;
  returnFlight?: TripPlanItemDto | null;
  hotel?: TripPlanItemDto | null;
  transfer?: TripPlanItemDto | null;
  days: TripPlanDayDto[];
  weatherSummary?: string;
  sources: AiSourceDto[];
  warnings: string[];
}

export interface TripPlanRequest {
  origin: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  budgetCurrency?: string;
  travelers?: number;
  preferences?: string[];
  pace?: string;
}
