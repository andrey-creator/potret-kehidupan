import { isAdminRequest, type AdminEnv } from "../_lib/admin-token";
import { MAX_PAGE_SIZE, MIN_PAGE_SIZE, ORDERS, getSettings, parseOrder, parsePageSize, saveSettings, type GallerySettings } from "../_lib/gallery-settings";

type Env = AdminEnv & { DB: D1Database };

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

// Publik: galeri membaca jumlah foto per halaman dan urutan dari sini.
export const onRequestGet: PagesFunction<Env> = async ({ env }) =>
  json({ ...(await getSettings(env.DB)), min: MIN_PAGE_SIZE, max: MAX_PAGE_SIZE, orders: ORDERS });

// Admin: ubah salah satu atau kedua pengaturan.
export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await isAdminRequest(request, env))) return json({ error: "Tidak diizinkan." }, 401);
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const changes: Partial<GallerySettings> = {};

  if (body && "gallery_page_size" in body) {
    const size = parsePageSize(body.gallery_page_size);
    if (size === null) return json({ error: `Isi angka bulat ${MIN_PAGE_SIZE}–${MAX_PAGE_SIZE}.` }, 400);
    changes.gallery_page_size = size;
  }
  if (body && "gallery_order" in body) {
    const order = parseOrder(body.gallery_order);
    if (order === null) return json({ error: "Urutan tidak dikenal." }, 400);
    changes.gallery_order = order;
  }
  if (Object.keys(changes).length === 0) return json({ error: "Tidak ada pengaturan yang dikirim." }, 400);

  await saveSettings(env.DB, changes);
  return json(await getSettings(env.DB));
};
