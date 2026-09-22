export interface Traveler {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  documentNumber?: string;
}

export interface BookingRequest {
  serviceType: 'FLIGHT' | 'HOTEL' | 'ACTIVITY' | 'TRANSFER';
  serviceId: string;
  serviceTitle: string;
  startDate: string;
  endDate?: string;
  traveler: Traveler;
  quantity: number;
  totalPrice: number;
  currency: string;
  specialRequests?: string;
}

export interface BookingResponse {
  bookingId: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  totalPrice: number;
  currency: string;
  createdAt: string;
  confirmationCode: string;
}

export interface BookingPricingResponseDto {
  bookingReference: string;
  pricingStatus: 'PRICED' | 'NOT_PRICED' | 'NOT_APPLICABLE';
  baseAmount?: number | null;
  taxAmount?: number | null;
  feeAmount?: number | null;
  totalAmount?: number | null;
  currency?: string | null;
  breakdownComplete: boolean;
  pricedAt: string;
  validUntil: string;
  provider: string;
  productType: string;
  canProceedToPayment: boolean;
  message?: string | null;
}

