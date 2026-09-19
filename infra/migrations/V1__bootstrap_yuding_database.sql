-- ====================================================================
-- Yuding V2 Database Migration V1: Bootstrap Database
-- Platform: PostgreSQL 16 + pgvector
-- Target Database: yuding
-- ====================================================================

-- 1. Create the 8 distinct logical schemas for microservice ownership
CREATE SCHEMA IF NOT EXISTS identity;
CREATE SCHEMA IF NOT EXISTS travel;
CREATE SCHEMA IF NOT EXISTS booking;
CREATE SCHEMA IF NOT EXISTS payment;
CREATE SCHEMA IF NOT EXISTS notification;
CREATE SCHEMA IF NOT EXISTS engagement;
CREATE SCHEMA IF NOT EXISTS ai;
CREATE SCHEMA IF NOT EXISTS audit;

-- 2. Enable pgvector extension inside the ai schema
CREATE EXTENSION IF NOT EXISTS vector SCHEMA ai;
