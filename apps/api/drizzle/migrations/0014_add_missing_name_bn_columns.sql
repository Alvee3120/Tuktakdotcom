-- Migration: Add missing name_bn columns to category and brand tables

ALTER TABLE "category" ADD COLUMN "name_bn" TEXT;
ALTER TABLE "brand" ADD COLUMN "name_bn" TEXT;
