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

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  if (!env.DB) return json({ error: "D1 binding DB belum dikonfigurasi." }, 503);
  try {
    try {
      const { results } = await env.DB.prepare(
        "SELECT id, src, alt, caption, size, sort_order, width, height FROM photos WHERE is_published = 1 ORDER BY sort_order ASC, id ASC"
      ).all();
      return json(results);
    } catch {
      // Kolom width/height belum ada (migrasi 0003 belum dijalankan): tetap tampilkan galeri.
      const { results } = await env.DB.prepare(
        "SELECT id, src, alt, caption, size, sort_order FROM photos WHERE is_published = 1 ORDER BY sort_order ASC, id ASC"
      ).all();
      return json(results);
    }
  } catch (error) {
    console.error("GET /api/photos failed", error);
    return json({ error: "Gagal membaca galeri." }, 500);
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!isAuthorized(request, env)) return json({ error: "Unauthorized" }, 401);
  if (!env.DB) return json({ error: "D1 binding DB belum dikonfigurasi." }, 503);
  try {
    const input = await request.json() as PhotoInput;
    if (!input.src || !input.alt || !input.caption || input.caption.length > 120 || !isPhotoSize(input.size ?? "regular")) {
      return json({ error: "src, alt, caption <= 120 karakter, dan size wajib valid." }, 400);
    }
    const result = await env.DB.prepare(
      "INSERT INTO photos (src, alt, caption, size, sort_order, is_published) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(input.src, input.alt, input.caption, input.size ?? "regular", input.sort_order ?? 0, input.is_published === false ? 0 : 1).run();
    return json({ id: result.meta.last_row_id, message: "Foto ditambahkan." }, 201);
  } catch (error) {
    console.error("POST /api/photos failed", error);
    return json({ error: "Payload JSON tidak valid atau insert gagal." }, 400);
  }
};
