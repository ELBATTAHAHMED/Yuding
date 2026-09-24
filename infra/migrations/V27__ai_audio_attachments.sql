-- Voice notes share the private, conversation-owned attachment store.
ALTER TABLE ai.attachments DROP CONSTRAINT IF EXISTS chk_attachments_kind;
ALTER TABLE ai.attachments ADD CONSTRAINT chk_attachments_kind
    CHECK (kind IN ('IMAGE', 'DOCUMENT', 'AUDIO'));
