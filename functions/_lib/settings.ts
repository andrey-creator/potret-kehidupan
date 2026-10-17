export const DEFAULT_PAGE_SIZE = 12;
export const MIN_PAGE_SIZE = 1;
export const MAX_PAGE_SIZE = 100;

/** Membersihkan nilai menjadi bilangan bulat dalam rentang yang diizinkan; null jika bukan angka. */
export function parsePageSize(value: unknown): number | null {
  const number = Math.floor(Number(value));
  if (!Number.isFinite(number) || number < MIN_PAGE_SIZE || number > MAX_PAGE_SIZE) return null;
  return number;
}

/** Membaca jumlah foto per halaman. Jika tabel belum dimigrasi atau nilai rusak, memakai bawaan. */
export async function getPageSize(db: D1Database): Promise<number> {
  try {
    const row = await db.prepare("SELECT value FROM settings WHERE key = 'gallery_page_size'").first<{ value: string }>();
    return parsePageSize(row?.value) ?? DEFAULT_PAGE_SIZE;
  } catch {
    return DEFAULT_PAGE_SIZE;
  }
}

export async function setPageSize(db: D1Database, size: number): Promise<void> {
  await db
    .prepare("INSERT INTO settings (key, value) VALUES ('gallery_page_size', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .bind(String(size))
    .run();
}
