package com.ahmed.notificationservice.domain.provider.mock;

import com.ahmed.notificationservice.domain.provider.EmailMessage;
import com.ahmed.notificationservice.domain.provider.EmailProvider;
import com.ahmed.notificationservice.domain.provider.EmailSendResult;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;

@Component
public class MockEmailProvider implements EmailProvider {

    private final List<EmailMessage> sentMessages = new CopyOnWriteArrayList<>();
    private final AtomicInteger transientFailuresRemaining = new AtomicInteger(0);
    private volatile boolean permanentFailureMode = false;

    @Override
    public String getProviderName() {
        return "mock";
    }

    @Override
    public EmailSendResult send(EmailMessage message) {
        if (permanentFailureMode) {
            return EmailSendResult.permanentFailure("MOCK_PERMANENT_ERROR", "Simulated permanent provider error");
        }

        if (transientFailuresRemaining.getAndDecrement() > 0) {
            return EmailSendResult.transientFailure("MOCK_TRANSIENT_ERROR", "Simulated transient connection timeout");
        }

        sentMessages.add(message);
        String mockMessageId = "MOCK-MSG-" + UUID.randomUUID().toString().substring(0, 8);
        return EmailSendResult.success(mockMessageId);
    }

    public List<EmailMessage> getSentMessages() {
        return Collections.unmodifiableList(sentMessages);
    }

    public void clear() {
        sentMessages.clear();
        transientFailuresRemaining.set(0);
        permanentFailureMode = false;
    }

    public void simulateTransientFailures(int count) {
        transientFailuresRemaining.set(count);
    }

    public void simulatePermanentFailure(boolean enabled) {
        permanentFailureMode = enabled;
    }
}
