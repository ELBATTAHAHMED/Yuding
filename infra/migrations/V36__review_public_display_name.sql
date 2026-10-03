-- Review authors can opt in to showing a public name; null remains anonymous.
ALTER TABLE engagement.reviews ADD COLUMN public_display_name VARCHAR(48);
