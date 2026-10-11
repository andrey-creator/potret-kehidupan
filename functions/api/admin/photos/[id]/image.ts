import { isAuthorized, json } from "../../../../_lib/auth";
import { batchWithThumbFallback, fileIdFromSrc, insertFile, readThumb, toBase64, toDimension, validateImage } from "../../../../_lib/images";

type Env = {
  DB: D1Database;
  ADMIN_TOKEN?: string;
};

const getParam = (value: string | string[] | undefined): string | undefined => Array.isArray(value) ? value[0] : value;

// Mengganti file foto pada entri yang sudah ada. File baru memakai id baru supaya alamatnya berubah
// (foto disajikan dengan cache 1 tahun, jadi menimpa id lama akan menampilkan gambar lama).
export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const id = Number(getParam(params.id));
  if (!Number.isInteger(id) || id <= 0) return json({ error: "ID foto tidak valid." }, 400);
  if (!(await isAuthorized(request, env.ADMIN_TOKEN))) return json({ error: "Unauthorized" }, 401);
  if (!env.DB) return json({ error: "D1 binding DB belum dikonfigurasi." }, 503);

  try {
    const form = await request.formData();
    const file = form.get("file");
    const invalid = validateImage(file);
    if (invalid) return json({ error: invalid.error }, invalid.status);
    const width = toDimension(form.get("width"));
    const height = toDimension(form.get("height"));

    const row = await env.DB.prepare("SELECT src FROM photos WHERE id = ?").bind(id).first<{ src: string }>();
    if (!row) return json({ error: "Foto tidak ditemukan." }, 404);

    const image = file as File;
    const fileId = crypto.randomUUID();
    const src = `/api/img/${fileId}`;
    const data = toBase64(await image.arrayBuffer());
    const thumb = await readThumb(form.get("thumb"));
    const oldFileId = fileIdFromSrc(row.src);

    await batchWithThumbFallback(env.DB, Boolean(thumb), (withThumb) => {
      const statements = [
        insertFile(env.DB, fileId, image.type, data, image.size, withThumb ? thumb : null),
        env.DB.prepare("UPDATE photos SET src = ?, width = ?, height = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(src, width, height, id)
      ];
      if (oldFileId) statements.push(env.DB.prepare("DELETE FROM photo_files WHERE id = ?").bind(oldFileId));
      return statements;
    });

    return json({ src, message: "File foto diganti." });
  } catch (error) {
    console.error("POST /api/admin/photos/:id/image failed", error);
    return json({ error: "Gagal mengganti file foto. Pastikan migrasi 0002 dan 0003 sudah dijalankan." }, 500);
  }
};
