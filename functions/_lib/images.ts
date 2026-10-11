// Helper bersama untuk upload dan penggantian file foto (disimpan di D1 sebagai base64).

export const MAX_BYTES = 1_300_000; // base64 ~1,73 MB, masih di bawah batas 2 MB per baris D1
export const MAX_THUMB_BYTES = 400_000;
export const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const toBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
};

export const toDimension = (value: FormDataEntryValue | null): number | null => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 && n <= 20000 ? n : null;
};

/** Mengembalikan pesan kesalahan jika file tidak valid, atau null jika valid. */
export const validateImage = (file: FormDataEntryValue | null): { error: string; status: number } | null => {
  if (!(file instanceof File) || file.size === 0) return { error: "File foto wajib diisi.", status: 400 };
  if (!ALLOWED_TYPES.includes(file.type)) return { error: "Format harus JPEG, PNG, atau WebP.", status: 400 };
  if (file.size > MAX_BYTES) return { error: "Foto terlalu besar. Maksimum sekitar 1,3 MB setelah dikecilkan.", status: 413 };
  return null;
};

/** Thumbnail bersifat opsional: file yang tidak valid diabaikan (galeri memakai file penuh). */
export const readThumb = async (value: FormDataEntryValue | null): Promise<string | null> => {
  if (!(value instanceof File) || value.size === 0 || value.size > MAX_THUMB_BYTES || !ALLOWED_TYPES.includes(value.type)) return null;
  return toBase64(await value.arrayBuffer());
};

/** Id file di D1 dari src berbentuk /api/img/<uuid>, atau null jika src bukan file D1. */
export const fileIdFromSrc = (src: string): string | null => /^\/api\/img\/([0-9a-f-]{36})$/.exec(src)?.[1] ?? null;

/**
 * Menjalankan batch yang menyimpan thumbnail; jika kolom thumb belum ada (migrasi 0004 belum dijalankan),
 * mengulang tanpa thumbnail agar upload tetap berhasil.
 */
export async function batchWithThumbFallback(
  db: D1Database,
  hasThumb: boolean,
  build: (withThumb: boolean) => D1PreparedStatement[]
): Promise<void> {
  if (!hasThumb) {
    await db.batch(build(false));
    return;
  }
  try {
    await db.batch(build(true));
  } catch {
    await db.batch(build(false));
  }
}

export const insertFile = (
  db: D1Database, id: string, mime: string, data: string, size: number, thumb: string | null
): D1PreparedStatement => thumb
  ? db.prepare("INSERT INTO photo_files (id, mime, data, size_bytes, thumb) VALUES (?, ?, ?, ?, ?)").bind(id, mime, data, size, thumb)
  : db.prepare("INSERT INTO photo_files (id, mime, data, size_bytes) VALUES (?, ?, ?, ?)").bind(id, mime, data, size);
