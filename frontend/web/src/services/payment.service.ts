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
   */
  async initiatePaymentOrder(
    bookingReference: string,
    returnUrl?: string,
    cancelUrl?: string
  ): Promise<PaymentOrderResponseDto> {
    const params = new URLSearchParams();
    if (returnUrl) params.append('returnUrl', returnUrl);
    if (cancelUrl) params.append('cancelUrl', cancelUrl);
    const queryString = params.toString() ? `?${params.toString()}` : '';

    return apiClient.post<PaymentOrderResponseDto>(
      `/bookings/${bookingReference}/payment/create-order${queryString}`,
      undefined,
      true
    );
  },

  /**
   * Captures an approved payment order and transitions the Booking to PAID.
   */
  async capturePayment(
    bookingReference: string,
    request?: PaymentCaptureRequestDto
  ): Promise<PaymentCaptureResponseDto> {
    return apiClient.post<PaymentCaptureResponseDto>(
      `/bookings/${bookingReference}/payment/capture`,
      request || {},
      true
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
