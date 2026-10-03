import { apiClient } from '../lib/api-client.ts';

export type ReviewTarget = 'ACCOMMODATION' | 'ACTIVITY' | 'PLATFORM' | 'EXPERIENCE';
export type BookableReviewTarget = Extract<ReviewTarget, 'ACCOMMODATION' | 'ACTIVITY'>;
export interface ReviewEligibility {
  bookingReference: string;
  eligible: boolean;
  reason: string;
  entityType: BookableReviewTarget | null;
  provider: string | null;
  entityReference: string | null;
  entityName: string | null;
}
export interface MyReview {
  id: string;
  rating: number;
  content: string;
  status: 'APPROVED' | 'PENDING_MODERATION' | 'REJECTED' | 'DELETED';
  entityName: string;
  updatedAt: string;
}
export interface PublicReview {
  rating: number;
  content: string;
  displayName: string;
  createdAt: string;
}
export interface PublicReviews {
  averageRating: number | null;
  reviewCount: number;
  reviews: PublicReview[];
}
export interface FeaturedReview extends PublicReview {
  entityName: string;
  entityType: ReviewTarget;
}
export interface PendingReview extends MyReview {
  entityType: BookableReviewTarget;
  provider: string;
  entityReference: string;
}

export const reviewService = {
  eligibility: (reference: string) => apiClient.get<ReviewEligibility>(`/apic/reviews/booking/${encodeURIComponent(reference)}/eligibility`, true),
  mine: async (reference: string) => {
    const result = await apiClient.get<{ review?: MyReview | null }>(`/apic/reviews/booking/${encodeURIComponent(reference)}/mine`, true);
    return result.review ?? null;
  },
  create: (reference: string, rating: number, content: string, publicDisplayName?: string) =>
    apiClient.post<MyReview>(`/apic/reviews/booking/${encodeURIComponent(reference)}`, { rating, content, publicDisplayName }, true),
  edit: (id: string, rating: number, content: string) =>
    apiClient.put<MyReview>(`/apic/reviews/${encodeURIComponent(id)}`, { rating, content }, true),
  delete: (id: string) => apiClient.delete<void>(`/apic/reviews/${encodeURIComponent(id)}`, true),
  public: (type: BookableReviewTarget, provider: string, reference: string) =>
    apiClient.get<PublicReviews>(`/apic/reviews/public/${type}/${encodeURIComponent(provider)}/${encodeURIComponent(reference)}`),
  featured: () => apiClient.get<FeaturedReview[]>('/apic/reviews/public/featured'),
  pending: () => apiClient.get<PendingReview[]>('/apic/reviews/moderation', true),
  moderate: (id: string, decision: 'APPROVED' | 'REJECTED') =>
    apiClient.put<void>(`/apic/reviews/moderation/${encodeURIComponent(id)}/${decision}`, undefined, true),
};
