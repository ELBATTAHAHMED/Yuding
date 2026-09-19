-- ====================================================================
-- Yuding V2 Database Initialization Notice
-- Platform: PostgreSQL 16 + pgvector
-- Target Database: yuding
--
-- Notice: Schemas, extensions (pgvector), and all database DDL are
-- exclusively managed and version-controlled by Flyway migrations
-- located in infra/migrations/.
-- ====================================================================

DO $$
BEGIN
    RAISE NOTICE 'Yuding V2 PostgreSQL database initialized. DDL lifecycle is managed by Flyway migrations.';
END $$;
