import { isAuthorized, json } from "../../_lib/auth";

type PhotoSize = "regular" | "wide" | "tall";

type Env = {
  DB: D1Database;
  ADMIN_TOKEN?: string;
};

const MAX_BYTES = 1_300_000; // base64 ~1,73 MB, masih di bawah batas 2 MB per baris D1
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const toBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await isAuthorized(request, env.ADMIN_TOKEN))) return json({ error: "Unauthorized" }, 401);
  if (!env.DB) return json({ error: "D1 binding DB belum dikonfigurasi." }, 503);

  try {
    const form = await request.formData();
    const file = form.get("file");
    const caption = String(form.get("caption") ?? "").trim();
    const alt = String(form.get("alt") ?? "").trim() || caption;
    const sizeValue = String(form.get("size") ?? "regular");
    const size: PhotoSize = sizeValue === "wide" || sizeValue === "tall" ? sizeValue : "regular";
    const toDimension = (value: FormDataEntryValue | null): number | null => {
      const n = Number(value);
      return Number.isInteger(n) && n > 0 && n <= 20000 ? n : null;
    };
    const width = toDimension(form.get("width"));
    const height = toDimension(form.get("height"));

    if (!(file instanceof File) || file.size === 0) return json({ error: "File foto wajib diisi." }, 400);
    if (!ALLOWED_TYPES.includes(file.type)) return json({ error: "Format harus JPEG, PNG, atau WebP." }, 400);
    if (file.size > MAX_BYTES) return json({ error: "Foto terlalu besar. Maksimum sekitar 1,3 MB setelah dikecilkan." }, 413);
    if (!caption || caption.length > 120) return json({ error: "Caption wajib diisi (maksimum 120 karakter)." }, 400);

    const id = crypto.randomUUID();
    const data = toBase64(await file.arrayBuffer());
    const src = `/api/img/${id}`;

    await env.DB.batch([
      env.DB.prepare("INSERT INTO photo_files (id, mime, data, size_bytes) VALUES (?, ?, ?, ?)").bind(id, file.type, data, file.size),
      env.DB.prepare(
        "INSERT INTO photos (src, alt, caption, size, sort_order, width, height) VALUES (?, ?, ?, ?, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM photos), ?, ?)"
      ).bind(src, alt, caption, size, width, height)
    ]);

    return json({ src, message: "Foto ditambahkan." }, 201);
  } catch (error) {
    console.error("POST /api/admin/photo-upload failed", error);
    return json({ error: "Upload gagal. Pastikan migrasi 0002 dan 0003 sudah dijalankan di D1." }, 500);
  }
};
