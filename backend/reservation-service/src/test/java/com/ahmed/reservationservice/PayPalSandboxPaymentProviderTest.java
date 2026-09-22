package com.ahmed.reservationservice;

import com.ahmed.reservationservice.domain.config.PaymentProperties;
import com.ahmed.reservationservice.domain.payment.provider.PaymentCaptureCommand;
import com.ahmed.reservationservice.domain.payment.provider.PaymentCaptureResult;
import com.ahmed.reservationservice.domain.payment.provider.PaymentOrderCommand;
import com.ahmed.reservationservice.domain.payment.provider.PaymentOrderResult;
import com.ahmed.reservationservice.domain.payment.provider.PayPalSandboxPaymentProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

@DisplayName("PayPalSandboxPaymentProvider Tests")
class PayPalSandboxPaymentProviderTest {

    private RestTemplate restTemplate;
    private MockRestServiceServer mockServer;
    private PaymentProperties properties;
    private PayPalSandboxPaymentProvider provider;

    @BeforeEach
    void setUp() {
        restTemplate = new RestTemplate();
        mockServer = MockRestServiceServer.createServer(restTemplate);

        properties = new PaymentProperties();
        properties.getPaypal().setBaseUrl("https://api-m.sandbox.paypal.com");
        properties.getPaypal().setClientId("test-client-id");
        properties.getPaypal().setClientSecret("test-client-secret");

        provider = new PayPalSandboxPaymentProvider(properties, restTemplate);
    }

    @Test
    @DisplayName("Should return provider name 'paypal-sandbox'")
    void shouldReturnCorrectProviderName() {
        assertThat(provider.getProviderName()).isEqualTo("paypal-sandbox");
    }

    @Test
    @DisplayName("Should successfully authenticate and create PayPal order")
    void shouldAuthenticateAndCreateOrder() {
        // Mock token request
        mockServer.expect(requestTo("https://api-m.sandbox.paypal.com/v1/oauth2/token"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", org.hamcrest.Matchers.startsWith("Basic ")))
                .andRespond(withSuccess("{\"access_token\":\"mock-access-token\",\"expires_in\":3600}", MediaType.APPLICATION_JSON));

        // Mock create order request
        mockServer.expect(requestTo("https://api-m.sandbox.paypal.com/v2/checkout/orders"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Bearer mock-access-token"))
                .andRespond(withSuccess("{\"id\":\"5O190127TN364715T\",\"status\":\"CREATED\",\"links\":[{\"rel\":\"approve\",\"href\":\"https://www.sandbox.paypal.com/checkoutnow?token=5O190127TN364715T\"}]}", MediaType.APPLICATION_JSON));

        PaymentOrderCommand command = PaymentOrderCommand.builder()
                .bookingReference("YUD-ABC12345")
                .paymentReference("PAY-ABC12345")
                .amount(new BigDecimal("75.50"))
                .currency("EUR")
                .returnUrl("http://localhost:3000/booking/confirmation")
                .cancelUrl("http://localhost:3000/booking")
                .build();

        PaymentOrderResult result = provider.createPaymentOrder(command);

        mockServer.verify();
        assertThat(result.isSuccess()).isTrue();
        assertThat(result.getProviderOrderId()).isEqualTo("5O190127TN364715T");
        assertThat(result.getApprovalUrl()).isEqualTo("https://www.sandbox.paypal.com/checkoutnow?token=5O190127TN364715T");
        assertThat(result.getStatus()).isEqualTo("CREATED");
    }

    @Test
    @DisplayName("Should successfully capture approved PayPal order")
    void shouldCapturePayPalOrder() {
        // Mock token request
        mockServer.expect(requestTo("https://api-m.sandbox.paypal.com/v1/oauth2/token"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess("{\"access_token\":\"mock-access-token\",\"expires_in\":3600}", MediaType.APPLICATION_JSON));

        // Mock capture request
        mockServer.expect(requestTo("https://api-m.sandbox.paypal.com/v2/checkout/orders/5O190127TN364715T/capture"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Bearer mock-access-token"))
                .andRespond(withSuccess("{\"status\":\"COMPLETED\",\"purchase_units\":[{\"payments\":{\"captures\":[{\"id\":\"2C679124TG364715T\",\"status\":\"COMPLETED\"}]}}]}", MediaType.APPLICATION_JSON));

        PaymentCaptureCommand command = PaymentCaptureCommand.builder()
                .providerOrderId("5O190127TN364715T")
                .paymentReference("PAY-ABC12345")
                .amount(new BigDecimal("75.50"))
                .currency("EUR")
                .build();

        PaymentCaptureResult result = provider.capturePaymentOrder(command);

        mockServer.verify();
        assertThat(result.isSuccess()).isTrue();
        assertThat(result.getProviderTransactionId()).isEqualTo("2C679124TG364715T");
        assertThat(result.getStatus()).isEqualTo("COMPLETED");
    }
}
