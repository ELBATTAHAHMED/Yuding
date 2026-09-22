export interface PaymentOrderResponseDto {
  bookingReference: string;
  paymentReference: string;
  providerName: string;
  providerOrderId: string;
  approvalUrl?: string | null;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

export interface PaymentCaptureRequestDto {
  paymentReference?: string;
  providerOrderId?: string;
}

export interface PaymentCaptureResponseDto {
  bookingReference: string;
  paymentReference: string;
  providerTransactionId?: string | null;
  paymentStatus: string;
  bookingStatus: string;
  amount: number;
  currency: string;
  message?: string | null;
}

export interface PaymentDetailsDto {
  paymentReference: string;
  bookingReference: string;
  providerName: string;
  providerOrderId?: string | null;
  providerTransactionId?: string | null;
  amount: number;
  currency: string;
  status: string;
  approvalUrl?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}
