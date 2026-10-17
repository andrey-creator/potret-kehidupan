CREATE TABLE IF NOT EXISTS gallery_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT OR IGNORE INTO gallery_settings (key, value) VALUES ('gallery_page_size', '12');
INSERT OR IGNORE INTO gallery_settings (key, value) VALUES ('gallery_order', 'default');
CREATE TABLE IF NOT EXISTS photo_albums (
  photo_id INTEGER PRIMARY KEY,
  album TEXT NOT NULL,
  album_en TEXT
);
