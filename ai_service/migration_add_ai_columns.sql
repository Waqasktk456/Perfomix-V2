-- Migration: Add AI analysis columns to evaluations table
-- Run this once against your saas_perfomix database

ALTER TABLE `evaluations`
  ADD COLUMN `ai_summary`   TEXT         NULL COMMENT 'AI-generated performance summary' AFTER `areas_for_improvement`,
  ADD COLUMN `ai_sentiment` VARCHAR(10)  NULL COMMENT 'POSITIVE / NEGATIVE / NEUTRAL'    AFTER `ai_summary`,
  ADD COLUMN `ai_flags`     JSON         NULL COMMENT 'Array of AI quality flags'         AFTER `ai_sentiment`;
