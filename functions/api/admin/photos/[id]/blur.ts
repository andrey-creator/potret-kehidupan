import { isAuthorized, json } from "../../../../_lib/auth";
import { readBlur } from "../../../../_lib/images";

type Env = {
  DB: D1Database;
  ADMIN_TOKEN?: string;
};

const getParam = (value: string | string[] | undefined): string | undefined => Array.isArray(value) ? value[0] : value;

// Menyimpan pratinjau buram untuk foto yang sudah ada (dipakai tombol "Siapkan foto lama" di admin).
export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const id = Number(getParam(params.id));
  if (!Number.isInteger(id) || id <= 0) return json({ error: "ID foto tidak valid." }, 400);
  if (!(await isAuthorized(request, env.ADMIN_TOKEN))) return json({ error: "Unauthorized" }, 401);
  if (!env.DB) return json({ error: "D1 binding DB belum dikonfigurasi." }, 503);

  let blurValue: unknown;
  try {
    blurValue = ((await request.json()) as { blur?: unknown }).blur;
  } catch {
    return json({ error: "Payload JSON tidak valid." }, 400);
  }
  const blur = readBlur(typeof blurValue === "string" ? blurValue : null);
  if (!blur) return json({ error: "blur harus berupa data URI JPEG/WebP kecil (maks. ~3 KB)." }, 400);

  try {
    const result = await env.DB.prepare("UPDATE photos SET blur = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(blur, id).run();
    return result.meta.changes ? json({ message: "Pratinjau buram disimpan." }) : json({ error: "Foto tidak ditemukan." }, 404);
  } catch (error) {
    console.error("POST /api/admin/photos/:id/blur failed", error);
    return json({ error: "Gagal menyimpan pratinjau buram. Pastikan migrasi 0006 sudah dijalankan." }, 500);
  }
};
