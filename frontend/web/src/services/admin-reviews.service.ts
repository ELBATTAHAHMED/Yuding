import { apiClient } from "@/lib/api-client";
import { adminQuery, AdminFilters } from "./admin.service";
import { AdminPagedResponse } from "@/types/admin.types";
import { PendingReview } from "./review.service";
export interface AdminReview extends PendingReview {
  userId: string;
  displayName?: string | null;
  verifiedBooking: boolean;
}
export const adminReviews = {
  detail: (id: string) =>
    apiClient.get<AdminReview>(`/apic/reviews/moderation/${id}/detail`, true),
  page: (p: AdminFilters = {}) =>
    apiClient.get<AdminPagedResponse<AdminReview>>(
      `/apic/reviews/moderation/page?${adminQuery({ ...p, page: p.page ?? 0, size: p.size ?? 25 })}${p.status === "ALL" ? "&status=ALL" : ""}`,
      true,
    ),
  moderate: (
    id: string,
    decision: "APPROVED" | "REJECTED",
    rejectionReason?: string,
  ) =>
    apiClient.put<void>(
      `/apic/reviews/moderation/${id}/${decision}`,
      { rejectionReason },
      true,
    ),
  history: (id: string) =>
    apiClient.get<
      {
        operatorId: string;
        decision: string;
        rejectionReason?: string;
        createdAt: string;
      }[]
    >(`/apic/reviews/moderation/${id}/history`, true),
};
