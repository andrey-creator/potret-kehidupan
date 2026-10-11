import { isAuthorized, json } from "../../../../_lib/auth";
import { fileIdFromSrc, readThumb } from "../../../../_lib/images";

type Env = {
  DB: D1Database;
  ADMIN_TOKEN?: string;
};

const getParam = (value: string | string[] | undefined): string | undefined => Array.isArray(value) ? value[0] : value;

// Menyimpan thumbnail untuk foto yang sudah ada (dipakai tombol "Buat thumbnail foto lama" di admin).
export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const id = Number(getParam(params.id));
  if (!Number.isInteger(id) || id <= 0) return json({ error: "ID foto tidak valid." }, 400);
  if (!(await isAuthorized(request, env.ADMIN_TOKEN))) return json({ error: "Unauthorized" }, 401);
  if (!env.DB) return json({ error: "D1 binding DB belum dikonfigurasi." }, 503);

  try {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return json({ error: "Body harus berupa multipart/form-data dengan field thumb." }, 400);
    }
    const thumb = await readThumb(form.get("thumb"));
    if (!thumb) return json({ error: "File thumbnail tidak valid (JPEG/PNG/WebP, maks. 400 KB)." }, 400);

    const row = await env.DB.prepare("SELECT src FROM photos WHERE id = ?").bind(id).first<{ src: string }>();
    if (!row) return json({ error: "Foto tidak ditemukan." }, 404);
    const fileId = fileIdFromSrc(row.src);
    if (!fileId) return json({ error: "Foto ini tidak disimpan di D1, jadi tidak butuh thumbnail." }, 409);

    const result = await env.DB.prepare("UPDATE photo_files SET thumb = ? WHERE id = ?").bind(thumb, fileId).run();
    return result.meta.changes ? json({ message: "Thumbnail disimpan." }) : json({ error: "File foto tidak ditemukan." }, 404);
  } catch (error) {
    console.error("POST /api/admin/photos/:id/thumb failed", error);
    return json({ error: "Gagal menyimpan thumbnail. Pastikan migrasi 0004 sudah dijalankan." }, 500);
  }
};
