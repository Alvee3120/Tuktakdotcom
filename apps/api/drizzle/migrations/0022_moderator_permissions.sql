-- Add permissions column to user table for moderator page access
ALTER TABLE user ADD COLUMN permissions TEXT;
