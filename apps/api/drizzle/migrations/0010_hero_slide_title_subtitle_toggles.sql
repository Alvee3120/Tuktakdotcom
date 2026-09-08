-- Add show_title and show_subtitle columns to hero_slide table
ALTER TABLE hero_slide ADD COLUMN show_title INTEGER DEFAULT 1;
ALTER TABLE hero_slide ADD COLUMN show_subtitle INTEGER DEFAULT 1;
