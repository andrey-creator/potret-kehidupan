-- Teks halaman awal yang bisa diubah dari admin (kalimat pembuka dan paragraf pengantar, dua bahasa).
-- Baris yang tidak ada = situs memakai teks bawaan dari config/site-text.json.
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
