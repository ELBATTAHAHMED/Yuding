export interface Traveler {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  documentNumber?: string;
}

export type BookingProductType = 'FLIGHT' | 'HOTEL' | 'ACTIVITY' | 'TRANSFER' | 'TRAIN';

export type BookingStatus =
  | 'DRAFT'
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'PAYMENT_FAILED'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'EXPIRED';

export interface CreateDraftBookingRequest {
  productType: BookingProductType;
  selectionRef?: string;
}

export interface AttachOfferSnapshotRequest {
  selectionRef: string;
}

export interface OfferSnapshotResponseDto {
  snapshotHash: string;
  bookingReference: string;
  productType: string;
  provider: string;
  providerOfferId: string;
  providerAmount: number;
  providerCurrency: string;
  selectedDetails: Record<string, any>;
  capturedAt: string;
  providerExpiresAt?: string | null;
}

export interface BookingResponseDto {
  bookingReference: string;
  userId?: string;
  productType: BookingProductType;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
  statusChangedAt?: string;
  expiresAt?: string;
  offerSnapshot?: OfferSnapshotResponseDto | null;
}

export interface BookingRevalidationResponseDto {
  bookingReference: string;
  provider: string;
  productType: string;
  availabilityStatus: 'AVAILABLE' | 'UNAVAILABLE' | 'UNKNOWN' | 'REVALIDATION_UNSUPPORTED' | string;
  priceStatus: 'UNCHANGED' | 'CHANGED' | 'UNKNOWN' | string;
  previousProviderAmount?: number | null;
  previousProviderCurrency?: string | null;
  currentProviderAmount?: number | null;
  currentProviderCurrency?: string | null;
  revalidatedAt: string;
  validUntil: string;
  requiresPriceConfirmation: boolean;
  priceChangeAccepted: boolean;
  canProceedToPricing: boolean;
  message?: string | null;
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

/** Legacy request format retained for backward compatibility */
export interface BookingRequest {
  serviceType: 'FLIGHT' | 'HOTEL' | 'ACTIVITY' | 'TRANSFER' | 'TRAIN';
  serviceId: string;
  serviceTitle: string;
  startDate: string;
  endDate?: string;
  traveler: Traveler;
  quantity: number;
  totalPrice: number;
  currency: string;
  specialRequests?: string;
  selectionRef?: string;
}

/** Legacy response format retained for backward compatibility */
export interface BookingResponse {
  bookingId: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  totalPrice: number;
  currency: string;
  createdAt: string;
  confirmationCode: string;
}
