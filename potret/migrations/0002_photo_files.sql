-- Menyimpan file foto langsung di D1 (base64), tanpa R2.
CREATE TABLE IF NOT EXISTS photo_files (
  id TEXT PRIMARY KEY,
  mime TEXT NOT NULL,
  data TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
