type PhotoSize = "regular" | "wide" | "tall";

type Env = {
  DB: D1Database;
  ADMIN_TOKEN?: string;
};

type PhotoInput = {
  src?: string;
  alt?: string;
  caption?: string;
  size?: PhotoSize;
  sort_order?: number;
  is_published?: boolean;
};

const json = (body: unknown, status = 200): Response => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": status === 200 ? "public, max-age=60" : "no-store" }
});

const isAuthorized = (request: Request, env: Env): boolean => {
  const expected = env.ADMIN_TOKEN;
  const received = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return Boolean(expected && received && received === expected);
};

const isPhotoSize = (value: unknown): value is PhotoSize => value === "regular" || value === "wide" || value === "tall";
const getParam = (value: string | string[] | undefined): string | undefined => Array.isArray(value) ? value[0] : value;
const getId = (params: { id?: string | string[] }): number | null => {
  const id = Number(getParam(params.id));
  return Number.isInteger(id) && id > 0 ? id : null;
};

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const id = getId(params);
  if (!id || !env.DB) return json({ error: "Foto tidak ditemukan." }, 404);
  const row = await env.DB.prepare("SELECT id, src, alt, caption, size, sort_order, is_published FROM photos WHERE id = ?").bind(id).first();
  return row ? json(row) : json({ error: "Foto tidak ditemukan." }, 404);
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  const id = getId(params);
  if (!id) return json({ error: "ID foto tidak valid." }, 400);
  if (!isAuthorized(request, env)) return json({ error: "Unauthorized" }, 401);
  if (!env.DB) return json({ error: "D1 binding DB belum dikonfigurasi." }, 503);
  try {
    const input = await request.json() as PhotoInput;
    if (!input.src || !input.alt || !input.caption || input.caption.length > 120 || !isPhotoSize(input.size ?? "regular")) {
      return json({ error: "src, alt, caption <= 120 karakter, dan size wajib valid." }, 400);
    }
    const result = await env.DB.prepare(
      "UPDATE photos SET src = ?, alt = ?, caption = ?, size = ?, sort_order = ?, is_published = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(input.src, input.alt, input.caption, input.size ?? "regular", input.sort_order ?? 0, input.is_published === false ? 0 : 1, id).run();
    return result.meta.changes ? json({ message: "Foto diperbarui." }) : json({ error: "Foto tidak ditemukan." }, 404);
  } catch (error) {
    console.error("PUT /api/photos/:id failed", error);
    return json({ error: "Payload JSON tidak valid atau update gagal." }, 400);
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  const id = getId(params);
  if (!id) return json({ error: "ID foto tidak valid." }, 400);
  if (!isAuthorized(request, env)) return json({ error: "Unauthorized" }, 401);
  if (!env.DB) return json({ error: "D1 binding DB belum dikonfigurasi." }, 503);
  const result = await env.DB.prepare("DELETE FROM photos WHERE id = ?").bind(id).run();
  return result.meta.changes ? json({ message: "Foto dihapus." }) : json({ error: "Foto tidak ditemukan." }, 404);
};
