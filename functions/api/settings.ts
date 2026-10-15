import { MAX_PAGE_SIZE, MIN_PAGE_SIZE, getPageSize, parsePageSize, setPageSize } from "../_lib/settings";

type Env = { DB: D1Database };

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

/**
 * TODO: sambungkan ke pemeriksaan login admin yang sudah dipakai halaman /admin Anda
 * (sesi, token, atau Cloudflare Access). Selama belum disambungkan, PUT ditolak (aman secara bawaan).
 */
async function isAdmin(_request: Request, _env: Env): Promise<boolean> {
  return false;
}

// Publik: galeri membaca jumlah foto per halaman dari sini.
export const onRequestGet: PagesFunction<Env> = async ({ env }) =>
  json({ gallery_page_size: await getPageSize(env.DB), min: MIN_PAGE_SIZE, max: MAX_PAGE_SIZE });

// Admin: ubah jumlah foto yang tampil sebelum "Muat lebih banyak".
export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await isAdmin(request, env))) return json({ error: "Tidak diizinkan." }, 401);
  const body = await request.json().catch(() => null) as { gallery_page_size?: unknown } | null;
  const size = parsePageSize(body?.gallery_page_size);
  if (size === null) return json({ error: `Isi angka bulat ${MIN_PAGE_SIZE}–${MAX_PAGE_SIZE}.` }, 400);
  await setPageSize(env.DB, size);
  return json({ gallery_page_size: size });
};
