package com.ahmed.reservationservice;

import com.ahmed.reservationservice.domain.payment.provider.MockPaymentProvider;
import com.ahmed.reservationservice.domain.payment.provider.PaymentCaptureCommand;
import com.ahmed.reservationservice.domain.payment.provider.PaymentCaptureResult;
import com.ahmed.reservationservice.domain.payment.provider.PaymentOrderCommand;
import com.ahmed.reservationservice.domain.payment.provider.PaymentOrderResult;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("MockPaymentProvider Tests")
class MockPaymentProviderTest {

    private final MockPaymentProvider provider = new MockPaymentProvider();

    @Test
    @DisplayName("Should return provider name 'mock'")
    void shouldReturnCorrectProviderName() {
        assertThat(provider.getProviderName()).isEqualTo("mock");
    }

    @Test
    @DisplayName("Should successfully create mock order")
    void shouldCreateMockOrder() {
        PaymentOrderCommand command = PaymentOrderCommand.builder()
                .bookingReference("YUD-ABC12345")
                .paymentReference("PAY-ABC12345")
                .amount(new BigDecimal("120.50"))
                .currency("EUR")
                .build();

        PaymentOrderResult result = provider.createPaymentOrder(command);
        assertThat(result.isSuccess()).isTrue();
        assertThat(result.getProviderOrderId()).startsWith("MOCK-ORDER-");
        assertThat(result.getApprovalUrl()).contains(result.getProviderOrderId());
        assertThat(result.getStatus()).isEqualTo("CREATED");
    }

    @Test
    @DisplayName("Should simulate failure on order creation when ref ends with FAIL")
    void shouldSimulateOrderFailure() {
        PaymentOrderCommand command = PaymentOrderCommand.builder()
                .bookingReference("YUD-ABC12345")
                .paymentReference("PAY-XYZFAIL")
                .amount(new BigDecimal("50.00"))
                .currency("EUR")
                .build();

        PaymentOrderResult result = provider.createPaymentOrder(command);
        assertThat(result.isSuccess()).isFalse();
        assertThat(result.getErrorMessage()).contains("simulated failure");
    }

    @Test
    @DisplayName("Should successfully capture mock order")
    void shouldCaptureMockOrder() {
        PaymentCaptureCommand command = PaymentCaptureCommand.builder()
                .providerOrderId("MOCK-ORDER-1234")
                .paymentReference("PAY-ABC12345")
                .amount(new BigDecimal("120.50"))
                .currency("EUR")
                .build();

        PaymentCaptureResult result = provider.capturePaymentOrder(command);
        assertThat(result.isSuccess()).isTrue();
        assertThat(result.getProviderTransactionId()).startsWith("MOCK-CAPTURE-");
        assertThat(result.getStatus()).isEqualTo("COMPLETED");
    }

    @Test
    @DisplayName("Should simulate capture failure when orderId contains FAIL")
    void shouldSimulateCaptureFailure() {
        PaymentCaptureCommand command = PaymentCaptureCommand.builder()
                .providerOrderId("MOCK-ORDER-FAIL-1")
                .paymentReference("PAY-ABC12345")
                .amount(new BigDecimal("120.50"))
                .currency("EUR")
                .build();

        PaymentCaptureResult result = provider.capturePaymentOrder(command);
        assertThat(result.isSuccess()).isFalse();
        assertThat(result.getErrorMessage()).contains("simulated failure");
    }
}
