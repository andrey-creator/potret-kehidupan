-- Pengaturan situs (key/value). Dipakai untuk jumlah foto per halaman di galeri.
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT OR IGNORE INTO settings (key, value) VALUES ('gallery_page_size', '12');
