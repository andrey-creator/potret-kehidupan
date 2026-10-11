-- Teks versi bahasa Inggris (opsional; jika kosong, situs memakai teks bahasa Indonesia).
ALTER TABLE photos ADD COLUMN caption_en TEXT;
ALTER TABLE photos ADD COLUMN alt_en TEXT;
ALTER TABLE photos ADD COLUMN location_en TEXT;
ALTER TABLE photos ADD COLUMN story_en TEXT;
