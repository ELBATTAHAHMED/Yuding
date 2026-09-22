package com.ahmed.reservationservice.domain.payment.provider;

/**
 * Provider-neutral abstraction for payment integrations (PayPal, Stripe, etc.).
 * Core booking and payment domains must depend strictly on this interface.
 */
public interface PaymentProvider {

    /**
     * Unique identifier for this payment provider (e.g. "paypal-sandbox", "mock").
     */
    String getProviderName();

    /**
     * Creates a payment order/intent with the provider.
     */
    PaymentOrderResult createPaymentOrder(PaymentOrderCommand command);

    /**
     * Captures or finalizes a payment order with the provider.
     */
    PaymentCaptureResult capturePaymentOrder(PaymentCaptureCommand command);

    /**
     * Refunds a captured payment with the provider using a stable provider request ID.
     */
    PaymentRefundResult refundPayment(PaymentRefundCommand command);
}
