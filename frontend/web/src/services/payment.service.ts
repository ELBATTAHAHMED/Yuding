import { apiClient } from '@/lib/api-client';
import {
  PaymentCaptureRequestDto,
  PaymentCaptureResponseDto,
  PaymentDetailsDto,
  PaymentOrderResponseDto,
} from '@/types/payment.types';

export const paymentService = {
  /**
   * Initiates a payment order with the server-configured PaymentProvider.
   * Payable amount and currency are determined strictly server-side.
   * Protected by Idempotency-Key.
   */
  async initiatePaymentOrder(
    bookingReference: string,
    returnUrl?: string,
    cancelUrl?: string,
    idempotencyKey?: string
  ): Promise<PaymentOrderResponseDto> {
    const params = new URLSearchParams();
    if (returnUrl) params.append('returnUrl', returnUrl);
    if (cancelUrl) params.append('cancelUrl', cancelUrl);
    const queryString = params.toString() ? `?${params.toString()}` : '';

    const key =
      idempotencyKey ||
      (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `idemp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);

    return apiClient.post<PaymentOrderResponseDto>(
      `/bookings/${bookingReference}/payment/create-order${queryString}`,
      undefined,
      true,
      { idempotencyKey: key }
    );
  },

  /**
   * Captures an approved payment order and transitions the Booking to PAID.
   * Protected by Idempotency-Key.
   */
  async capturePayment(
    bookingReference: string,
    request?: PaymentCaptureRequestDto,
    idempotencyKey?: string
  ): Promise<PaymentCaptureResponseDto> {
    const key =
      idempotencyKey ||
      (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `idemp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);

    return apiClient.post<PaymentCaptureResponseDto>(
      `/bookings/${bookingReference}/payment/capture`,
      request || {},
      true,
      { idempotencyKey: key }
    );
  },

  /**
   * Retrieves current payment details for a Booking.
   */
  async getPaymentDetails(bookingReference: string): Promise<PaymentDetailsDto> {
    return apiClient.get<PaymentDetailsDto>(
      `/bookings/${bookingReference}/payment`,
      true
    );
  },
};
