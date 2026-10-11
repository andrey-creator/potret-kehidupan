import { isAuthorized, json } from "../../_lib/auth";
import { toBase64, toDimension, validateImage } from "../../_lib/images";

type PhotoSize = "regular" | "wide" | "tall";

type Env = {
  DB: D1Database;
  ADMIN_TOKEN?: string;
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
    const width = toDimension(form.get("width"));
    const height = toDimension(form.get("height"));

    const invalid = validateImage(file);
    if (invalid) return json({ error: invalid.error }, invalid.status);
    if (!caption || caption.length > 120) return json({ error: "Caption wajib diisi (maksimum 120 karakter)." }, 400);

    const image = file as File;
    const id = crypto.randomUUID();
    const data = toBase64(await image.arrayBuffer());
    const src = `/api/img/${id}`;

    await env.DB.batch([
      env.DB.prepare("INSERT INTO photo_files (id, mime, data, size_bytes) VALUES (?, ?, ?, ?)").bind(id, image.type, data, image.size),
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
