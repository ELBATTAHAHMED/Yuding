package com.ahmed.aiservice.domain.attachment.storage;

import java.io.IOException;
import java.util.UUID;

public interface AttachmentStorage {

    String store(UUID attachmentId, String originalFilename, byte[] content) throws IOException;

    byte[] load(String storageKey) throws IOException;

    void delete(String storageKey);
}
