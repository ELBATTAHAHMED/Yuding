-- ====================================================================
-- Yuding V2 Database Initialization Script
-- Platform: PostgreSQL 16 + pgvector
-- Target Database: yuding
-- ====================================================================

-- 1. Create the 8 distinct logical schemas for service ownership
CREATE SCHEMA IF NOT EXISTS identity;
CREATE SCHEMA IF NOT EXISTS travel;
CREATE SCHEMA IF NOT EXISTS booking;
CREATE SCHEMA IF NOT EXISTS payment;
CREATE SCHEMA IF NOT EXISTS notification;
CREATE SCHEMA IF NOT EXISTS engagement;
CREATE SCHEMA IF NOT EXISTS ai;
CREATE SCHEMA IF NOT EXISTS audit;

-- 2. Enable pgvector extension once, configured consistently in the ai schema
CREATE EXTENSION IF NOT EXISTS vector SCHEMA ai;

-- Log confirmation
DO $$
BEGIN
    RAISE NOTICE 'Yuding V2 PostgreSQL database and logical schemas initialized successfully.';
END $$;
