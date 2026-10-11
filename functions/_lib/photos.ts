// Pemilihan kolom bertingkat: jika migrasi terbaru belum dijalankan, kueri otomatis
// mundur ke set kolom yang lebih sedikit sehingga situs tetap tampil.

export const PUBLIC_COLUMN_SETS = [
  "id, src, alt, caption, size, sort_order, width, height, taken_at, location",
  "id, src, alt, caption, size, sort_order, width, height",
  "id, src, alt, caption, size, sort_order"
];

export const ADMIN_COLUMN_SETS = [
  "id, src, alt, caption, size, sort_order, is_published, width, height, taken_at, location, story, " +
    "CASE WHEN (SELECT thumb FROM photo_files WHERE id = substr(photos.src, 10)) IS NOT NULL THEN 1 ELSE 0 END AS has_thumb",
  "id, src, alt, caption, size, sort_order, is_published, width, height, taken_at, location, story",
  "id, src, alt, caption, size, sort_order, is_published, width, height",
  "id, src, alt, caption, size, sort_order, is_published"
];

export const DETAIL_COLUMN_SETS = [
  "id, src, alt, caption, size, width, height, taken_at, location, story",
  "id, src, alt, caption, size, width, height",
  "id, src, alt, caption, size"
];

export async function queryWithFallback<T>(
  columnSets: string[],
  build: (columns: string) => D1PreparedStatement
): Promise<T[]> {
  let lastError: unknown;
  for (const columns of columnSets) {
    try {
      const { results } = await build(columns).all<T>();
      return results;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}
