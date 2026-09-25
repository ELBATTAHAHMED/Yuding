import { apiClient } from '../lib/api-client.ts';
import type {
  AttachOfferSnapshotRequest,
  BookingPricingResponseDto,
  BookingConfirmationDto,
  BookingRequest,
  BookingResponse,
  BookingResponseDto,
  BookingRevalidationResponseDto,
  CreateDraftBookingRequest,
  OfferSnapshotResponseDto,
} from '../types/booking.types.ts';

export const bookingService = {
  /**
   * Creates a new DRAFT booking shell.
   * If selectionRef is present, attaches the trusted OfferSnapshot atomically.
   * Protected by Idempotency-Key.
   */
  async createDraftBooking(
    request: CreateDraftBookingRequest,
    idempotencyKey?: string
  ): Promise<BookingResponseDto> {
    const key =
      idempotencyKey ||
      (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `idemp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);

    return apiClient.post<BookingResponseDto>('/bookings', request, true, {
      idempotencyKey: key,
    });
  },

  /**
   * Attaches an immutable offer snapshot to an existing DRAFT booking.
   */
  async attachOfferSnapshot(
    bookingReference: string,
    request: AttachOfferSnapshotRequest
  ): Promise<OfferSnapshotResponseDto> {
    return apiClient.post<OfferSnapshotResponseDto>(
      `/bookings/${bookingReference}/offer-snapshot`,
      request,
      true
    );
  },

  /**
   * Performs live provider revalidation on the booking snapshot (Phase 36).
   */
  async revalidateBooking(bookingReference: string): Promise<BookingRevalidationResponseDto> {
    return apiClient.post<BookingRevalidationResponseDto>(
      `/bookings/${bookingReference}/revalidate`,
      undefined,
      true
    );
  },

  /**
   * Acknowledges and accepts a changed price quote during revalidation (Phase 36).
   */
  async acceptPriceChange(bookingReference: string): Promise<BookingRevalidationResponseDto> {
    return apiClient.post<BookingRevalidationResponseDto>(
      `/bookings/${bookingReference}/revalidation/accept-price-change`,
      undefined,
      true
    );
  },

  /**
   * Retrieves a booking by its public reference (YUD-XXXXXXXX) (Phase 34).
   */
  async getBookingByReference(bookingReference: string): Promise<BookingResponseDto> {
    return apiClient.get<BookingResponseDto>(`/bookings/${bookingReference}`, true);
  },

  /**
   * Retrieves the read-only, backend-authoritative confirmation projection.
   * The reference identifies the resource only; no query value can influence its state or amount.
   */
  async getConfirmation(bookingReference: string): Promise<BookingConfirmationDto> {
    return apiClient.get<BookingConfirmationDto>(`/bookings/${bookingReference}/confirmation`, true);
  },

  /**
   * Establishes server-authoritative pricing for a booking based on fresh revalidation (Phase 37).
   */
  async createAuthoritativePricing(bookingReference: string): Promise<BookingPricingResponseDto> {
    return apiClient.post<BookingPricingResponseDto>(
      `/bookings/${bookingReference}/pricing`,
      undefined,
      true
    );
  },

  /**
   * Retrieves the latest server-authoritative pricing quote for a booking (Phase 37).
   */
  async getAuthoritativePricing(bookingReference: string): Promise<BookingPricingResponseDto> {
    return apiClient.get<BookingPricingResponseDto>(`/bookings/${bookingReference}/pricing`, true);
  },

  /**
   * Lists all bookings belonging to the currently authenticated user.
   */
  async getMyBookings(): Promise<BookingResponseDto[]> {
    try {
      return await apiClient.get<BookingResponseDto[]>('/bookings/me', true);
    } catch {
      return apiClient.get<BookingResponseDto[]>('/apir/reservations/me', true);
    }
  },

  /**
   * @deprecated The legacy endpoint could manufacture a client confirmation. Use the Phase 34+
   * draft, snapshot, pricing, payment, and confirmation APIs instead.
   */
  async createBooking(_request: BookingRequest): Promise<BookingResponse> {
    throw new Error('Legacy booking creation is disabled. Create a DRAFT booking through the authoritative booking flow.');
  },
};
