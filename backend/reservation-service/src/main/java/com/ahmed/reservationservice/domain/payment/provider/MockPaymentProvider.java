package com.ahmed.reservationservice.domain.payment.provider;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Value;

import java.util.UUID;

/**
 * Deterministic Mock Payment Provider for unit/integration testing and local fallback.
 */
@Component("mockPaymentProvider")
@Slf4j
public class MockPaymentProvider implements PaymentProvider {

    @Value("${yuding.payment.mock-refund-failure:false}")
    private boolean simulatedRefundFailure;

    public static final String PROVIDER_NAME = "mock";

    @Override
    public String getProviderName() {
        return PROVIDER_NAME;
    }

    @Override
    public PaymentOrderResult createPaymentOrder(PaymentOrderCommand command) {
        log.info("MockPayment: Creating mock order for booking [{}] ref [{}] amount [{} {}]",
                command.getBookingReference(), command.getPaymentReference(), command.getAmount(), command.getCurrency());

        if (command.getPaymentReference() != null && command.getPaymentReference().endsWith("FAIL")) {
            return PaymentOrderResult.failure("Mock payment order creation simulated failure");
        }

        String mockOrderId = "MOCK-ORDER-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        String mockApprovalUrl = "https://mock.payment.yuding.local/checkout?orderId=" + mockOrderId;
        return PaymentOrderResult.success(mockOrderId, mockApprovalUrl, "mock-client-token-" + mockOrderId, "CREATED");
    }

    @Override
    public PaymentCaptureResult capturePaymentOrder(PaymentCaptureCommand command) {
        log.info("MockPayment: Capturing mock order [{}] ref [{}] amount [{} {}]",
                command.getProviderOrderId(), command.getPaymentReference(), command.getAmount(), command.getCurrency());

        if (command.getProviderOrderId() != null && command.getProviderOrderId().contains("FAIL")) {
            return PaymentCaptureResult.failure("Mock payment capture simulated failure");
        }

        String mockCaptureId = "MOCK-CAPTURE-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        return PaymentCaptureResult.success(mockCaptureId, "COMPLETED");
    }

    @Override
    public PaymentRefundResult refundPayment(PaymentRefundCommand command) {
        log.info("MockPayment: Refunding mock capture [{}] ref [{}] amount [{} {}] reqId [{}]",
                command.getCaptureId(), command.getPaymentReference(), command.getAmount(), command.getCurrency(), command.getProviderRequestId());

        if (simulatedRefundFailure || (command.getCaptureId() != null && command.getCaptureId().contains("FAIL"))) {
            return PaymentRefundResult.failure("Mock refund simulated failure");
        }

        // The same request ID always resolves to the same simulated refund reference.
        String mockRefundId = "MOCK-REFUND-" + java.util.UUID.nameUUIDFromBytes(
                command.getProviderRequestId().getBytes(java.nio.charset.StandardCharsets.UTF_8))
                .toString().substring(0, 8).toUpperCase();
        return PaymentRefundResult.success(mockRefundId, "COMPLETED");
    }
}
