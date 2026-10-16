export const DEFAULT_PAGE_SIZE = 12;
export const MIN_PAGE_SIZE = 1;
export const MAX_PAGE_SIZE = 100;

// default = urutan dari server; newest/oldest = menurut tanggal foto; random = acak tiap dibuka.
export const ORDERS = ["default", "newest", "oldest", "random"] as const;
export type GalleryOrder = (typeof ORDERS)[number];
export const DEFAULT_ORDER: GalleryOrder = "default";

export type GallerySettings = { gallery_page_size: number; gallery_order: GalleryOrder };

/** Membersihkan nilai menjadi bilangan bulat dalam rentang yang diizinkan; null jika bukan angka. */
export function parsePageSize(value: unknown): number | null {
  const number = Math.floor(Number(value));
  if (!Number.isFinite(number) || number < MIN_PAGE_SIZE || number > MAX_PAGE_SIZE) return null;
  return number;
}

export function parseOrder(value: unknown): GalleryOrder | null {
  return typeof value === "string" && (ORDERS as readonly string[]).includes(value) ? (value as GalleryOrder) : null;
}

/** Membaca pengaturan. Jika tabel belum dimigrasi atau nilai rusak, memakai nilai bawaan. */
export async function getSettings(db: D1Database): Promise<GallerySettings> {
  const result: GallerySettings = { gallery_page_size: DEFAULT_PAGE_SIZE, gallery_order: DEFAULT_ORDER };
  try {
    const { results } = await db
      .prepare("SELECT key, value FROM gallery_settings WHERE key IN ('gallery_page_size', 'gallery_order')")
      .all<{ key: string; value: string }>();
    for (const row of results) {
      if (row.key === "gallery_page_size") result.gallery_page_size = parsePageSize(row.value) ?? DEFAULT_PAGE_SIZE;
      if (row.key === "gallery_order") result.gallery_order = parseOrder(row.value) ?? DEFAULT_ORDER;
    }
  } catch {
    // Tabel gallery_settings belum ada: pakai bawaan.
  }
  return result;
}

/** Menyimpan hanya kolom yang dikirim; semuanya dalam satu batch. */
export async function saveSettings(db: D1Database, changes: Partial<GallerySettings>): Promise<void> {
  const upsert = "INSERT INTO gallery_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value";
  const statements: D1PreparedStatement[] = [];
  if (changes.gallery_page_size !== undefined) statements.push(db.prepare(upsert).bind("gallery_page_size", String(changes.gallery_page_size)));
  if (changes.gallery_order !== undefined) statements.push(db.prepare(upsert).bind("gallery_order", changes.gallery_order));
  if (statements.length > 0) await db.batch(statements);
}
