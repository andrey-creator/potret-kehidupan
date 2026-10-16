-- Pengaturan tampilan galeri (jumlah foto per halaman dan urutan).
-- Tabel sendiri, terpisah dari tabel pengaturan teks halaman awal (migrasi 0007).
CREATE TABLE IF NOT EXISTS gallery_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT OR IGNORE INTO gallery_settings (key, value) VALUES ('gallery_page_size', '12');
INSERT OR IGNORE INTO gallery_settings (key, value) VALUES ('gallery_order', 'default');
