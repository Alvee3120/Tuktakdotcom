-- Clean up corrupted data: literal snake_case column-name strings stored as values
-- This happened because the admin UI previously sent column names instead of actual values
UPDATE hero_slide SET title_bn = NULL WHERE title_bn IN ('title_bn');
UPDATE hero_slide SET subtitle_bn = NULL WHERE subtitle_bn IN ('subtitle_bn');
UPDATE hero_slide SET description_bn = NULL WHERE description_bn IN ('description_bn');
UPDATE hero_slide SET cta_text_bn = NULL WHERE cta_text_bn IN ('cta_text_bn');
UPDATE hero_slide SET cta_secondary_text_bn = NULL WHERE cta_secondary_text_bn IN ('cta_secondary_text_bn');
UPDATE hero_slide SET badge_bn = NULL WHERE badge_bn IN ('badge_bn');
UPDATE hero_slide SET product_id = NULL WHERE product_id IN ('product_id');
UPDATE hero_slide SET title_font_size = 'lg' WHERE title_font_size IN ('title_font_size');
UPDATE hero_slide SET subtitle_font_size = 'md' WHERE subtitle_font_size IN ('subtitle_font_size');
UPDATE hero_slide SET animation = 'fade' WHERE animation IN ('animation');
