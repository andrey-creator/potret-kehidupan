import { isAuthorized, json } from "../../_lib/auth";

type Env = {
  DB: D1Database;
  ADMIN_TOKEN?: string;
};

const MAX_PHOTOS = 1000;
const MAX_ID = 2_147_483_647;

// Menyimpan urutan baru: body { "ids": [id pertama, id kedua, ...] } berisi SEMUA foto.
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await isAuthorized(request, env.ADMIN_TOKEN))) return json({ error: "Unauthorized" }, 401);
  if (!env.DB) return json({ error: "D1 binding DB belum dikonfigurasi." }, 503);

  let ids: unknown;
  try {
    ids = ((await request.json()) as { ids?: unknown }).ids;
  } catch {
    return json({ error: "Payload JSON tidak valid." }, 400);
  }
  if (
    !Array.isArray(ids) || ids.length === 0 || ids.length > MAX_PHOTOS ||
    !ids.every((id) => typeof id === "number" && Number.isInteger(id) && id > 0 && id <= MAX_ID) ||
    new Set(ids).size !== ids.length
  ) {
    return json({ error: "ids harus berisi daftar id foto yang unik." }, 400);
  }
  const order = ids as number[];

  try {
    const { results } = await env.DB.prepare("SELECT id FROM photos").all<{ id: number }>();
    const existing = new Set(results.map((row) => row.id));
    if (existing.size !== order.length || !order.every((id) => existing.has(id))) {
      return json({ error: "Daftar foto sudah berubah. Muat ulang halaman admin." }, 409);
    }

    // Semua nilai di bawah sudah divalidasi sebagai bilangan bulat, jadi aman disisipkan langsung
    // (menghindari batas 100 parameter per kueri D1).
    const cases = order.map((id, index) => `WHEN ${id} THEN ${index + 1}`).join(" ");
    await env.DB.prepare(
      `UPDATE photos SET sort_order = CASE id ${cases} END, updated_at = CURRENT_TIMESTAMP WHERE id IN (${order.join(",")})`
    ).run();
    return json({ message: "Urutan disimpan." });
  } catch (error) {
    console.error("POST /api/admin/reorder failed", error);
    return json({ error: "Gagal menyimpan urutan." }, 500);
  }
};
