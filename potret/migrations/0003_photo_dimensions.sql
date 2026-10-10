-- Menyimpan lebar dan tinggi foto agar galeri bisa memakai rasio asli (tanpa dipotong).
ALTER TABLE photos ADD COLUMN width INTEGER;
ALTER TABLE photos ADD COLUMN height INTEGER;
