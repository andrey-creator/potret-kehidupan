CREATE TABLE IF NOT EXISTS photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  src TEXT NOT NULL,
  alt TEXT NOT NULL,
  caption TEXT NOT NULL CHECK (length(caption) <= 120),
  size TEXT NOT NULL DEFAULT 'regular' CHECK (size IN ('regular', 'wide', 'tall')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published INTEGER NOT NULL DEFAULT 1 CHECK (is_published IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_photos_public_order
  ON photos (is_published, sort_order, id);

INSERT OR IGNORE INTO photos (id, src, alt, caption, size, sort_order)
VALUES
  (1, 'https://picsum.photos/seed/potret-01/1400/1750', 'Cahaya pagi di balik jendela', 'Pagi datang perlahan.', 'tall', 1),
  (2, 'https://picsum.photos/seed/potret-02/1600/1000', 'Jalan panjang dengan bayangan pepohonan', 'Jalan yang pernah kita pilih.', 'wide', 2),
  (3, 'https://picsum.photos/seed/potret-03/1200/1600', 'Kursi kosong di ruang yang tenang', 'Tempat sunyi menyimpan cerita.', 'regular', 3),
  (4, 'https://picsum.photos/seed/potret-04/1200/1600', 'Tangan memegang bunga kecil', 'Hal kecil, rasa yang besar.', 'regular', 4),
  (5, 'https://picsum.photos/seed/potret-05/1600/1000', 'Langit sore berwarna lembut', 'Sore yang masih tinggal.', 'wide', 5),
  (6, 'https://picsum.photos/seed/potret-06/1200/1600', 'Bangku taman di bawah cahaya', 'Berhenti sebentar di sini.', 'tall', 6),
  (7, 'https://picsum.photos/seed/potret-07/1200/1600', 'Detail arsitektur dan cahaya', 'Cahaya menemukan jalannya.', 'regular', 7),
  (8, 'https://picsum.photos/seed/potret-08/1600/1000', 'Pemandangan laut dari kejauhan', 'Jauh, namun terasa dekat.', 'wide', 8),
  (9, 'https://picsum.photos/seed/potret-09/1200/1600', 'Buku terbuka di atas meja', 'Halaman yang belum selesai.', 'regular', 9),
  (10, 'https://picsum.photos/seed/potret-10/1200/1600', 'Siluet seseorang di senja hari', 'Kita tumbuh dari perjalanan.', 'tall', 10),
  (11, 'https://picsum.photos/seed/potret-11/1600/1000', 'Pemandangan kota dari atas', 'Ramai yang tetap terasa hening.', 'wide', 11),
  (12, 'https://picsum.photos/seed/potret-12/1200/1600', 'Daun hijau terkena embun', 'Pagi meninggalkan jejak.', 'regular', 12),
  (13, 'https://picsum.photos/seed/potret-13/1200/1600', 'Jendela dengan tirai putih', 'Rumah adalah suara-suara kecil.', 'regular', 13),
  (14, 'https://picsum.photos/seed/potret-14/1600/1000', 'Awan tipis di atas bukit', 'Langit selalu punya ruang.', 'wide', 14),
  (15, 'https://picsum.photos/seed/potret-15/1200/1600', 'Sepeda bersandar di dinding', 'Pulang lewat jalan berbeda.', 'tall', 15),
  (16, 'https://picsum.photos/seed/potret-16/1200/1600', 'Cangkir di dekat cahaya pagi', 'Hari ini cukup untuk dikenang.', 'regular', 16);
