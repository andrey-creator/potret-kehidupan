export const ALBUM_MAX = 40;

export type AlbumEntry = { album: string; album_en: string | null };

/** Merapikan nama album: spasi berlebih dibuang, tanpa karakter kontrol, maksimal ALBUM_MAX karakter. */
export function cleanAlbumName(value: unknown): string {
  if (typeof value !== "string") return "";
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, ALBUM_MAX);
}

type Row = { photo_id: number; album: string; album_en: string | null };

const ALL_SQL = "SELECT photo_id, album, album_en FROM photo_albums";
// Pengunjung hanya mendapat album foto yang tampil di situs.
const PUBLISHED_SQL = "SELECT a.photo_id, a.album, a.album_en FROM photo_albums a JOIN photos p ON p.id = a.photo_id WHERE p.is_published = 1";

/** Peta id foto -> album. Jika tabel belum dimigrasi, hasilnya kosong (galeri tampil tanpa album). */
export async function getAlbums(db: D1Database, publishedOnly: boolean): Promise<Record<string, AlbumEntry>> {
  for (const sql of publishedOnly ? [PUBLISHED_SQL, ALL_SQL] : [ALL_SQL]) {
    try {
      const { results } = await db.prepare(sql).all<Row>();
      const map: Record<string, AlbumEntry> = {};
      for (const row of results) map[String(row.photo_id)] = { album: row.album, album_en: row.album_en };
      return map;
    } catch {
      // Kolom is_published atau tabel belum ada: coba kueri berikutnya.
    }
  }
  return {};
}

export async function saveAlbum(db: D1Database, photoId: number, album: string, albumEn: string): Promise<void> {
  if (!album) {
    await db.prepare("DELETE FROM photo_albums WHERE photo_id = ?").bind(photoId).run();
    return;
  }
  await db
    .prepare("INSERT INTO photo_albums (photo_id, album, album_en) VALUES (?, ?, ?) ON CONFLICT(photo_id) DO UPDATE SET album = excluded.album, album_en = excluded.album_en")
    .bind(photoId, album, albumEn || null)
    .run();
}
