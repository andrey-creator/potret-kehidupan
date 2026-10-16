-- Album/kategori foto. Tabel sendiri (terpisah dari tabel photos) agar tidak mengubah API foto yang sudah ada.
CREATE TABLE IF NOT EXISTS photo_albums (
  photo_id INTEGER PRIMARY KEY,
  album TEXT NOT NULL,
  album_en TEXT
);
