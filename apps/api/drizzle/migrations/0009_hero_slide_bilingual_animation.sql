-- Add bilingual fields, animation, font controls, product link, and trust badge toggle to hero_slide
ALTER TABLE hero_slide ADD COLUMN title_bn TEXT;
ALTER TABLE hero_slide ADD COLUMN subtitle_bn TEXT;
ALTER TABLE hero_slide ADD COLUMN description_bn TEXT;
ALTER TABLE hero_slide ADD COLUMN cta_text_bn TEXT;
ALTER TABLE hero_slide ADD COLUMN cta_secondary_text_bn TEXT;
ALTER TABLE hero_slide ADD COLUMN badge_bn TEXT;
ALTER TABLE hero_slide ADD COLUMN animation TEXT DEFAULT 'fade';
ALTER TABLE hero_slide ADD COLUMN title_font_size TEXT DEFAULT 'lg';
ALTER TABLE hero_slide ADD COLUMN subtitle_font_size TEXT DEFAULT 'md';
ALTER TABLE hero_slide ADD COLUMN product_id TEXT;
ALTER TABLE hero_slide ADD COLUMN show_trust_badges INTEGER DEFAULT 1;
