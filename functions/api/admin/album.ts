import { isAdminRequest, type AdminEnv } from "../../_lib/auth";
import { cleanAlbumName, saveAlbum } from "../../_lib/albums";

type Env = AdminEnv & { DB: D1Database };

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

// Admin: set album satu foto. Nama album kosong = foto dikeluarkan dari album.
export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await isAdminRequest(request, env))) return json({ error: "Tidak diizinkan." }, 401);
  const body = await request.json().catch(() => null) as { photo_id?: unknown; album?: unknown; album_en?: unknown } | null;
  const photoId = Number(body?.photo_id);
  if (!Number.isInteger(photoId) || photoId <= 0) return json({ error: "ID foto tidak valid." }, 400);

  const exists = await env.DB.prepare("SELECT 1 AS ok FROM photos WHERE id = ?").bind(photoId).first<{ ok: number }>();
  if (!exists) return json({ error: "Foto tidak ditemukan." }, 404);

  const album = cleanAlbumName(body?.album);
  const albumEn = cleanAlbumName(body?.album_en);
  try {
    await saveAlbum(env.DB, photoId, album, albumEn);
  } catch {
    return json({ error: "Fitur album butuh migrasi 0102 di D1." }, 500);
  }
  return json({ photo_id: photoId, album: album || null, album_en: albumEn || null });
};
