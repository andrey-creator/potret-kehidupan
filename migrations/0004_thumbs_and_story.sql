-- Thumbnail untuk grid galeri, serta tanggal, lokasi, dan cerita singkat per foto.
ALTER TABLE photo_files ADD COLUMN thumb TEXT;
ALTER TABLE photos ADD COLUMN taken_at TEXT;
ALTER TABLE photos ADD COLUMN location TEXT;
ALTER TABLE photos ADD COLUMN story TEXT;
