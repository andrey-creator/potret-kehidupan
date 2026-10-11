import { isAuthorized, json } from "../../../_lib/auth";

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
  taken_at?: string | null;
  location?: string | null;
  story?: string | null;
  caption_en?: string | null;
  alt_en?: string | null;
  location_en?: string | null;
  story_en?: string | null;
};

// Kolom opsional dan panjang maksimumnya. Hanya yang dikirim yang diubah (null atau "" = dikosongkan).
const OPTIONAL_FIELDS = [
  ["taken_at", 10], ["location", 80], ["story", 1200],
  ["caption_en", 120], ["alt_en", 300], ["location_en", 80], ["story_en", 1200]
] as const;

const isPhotoSize = (value: unknown): value is PhotoSize => value === "regular" || value === "wide" || value === "tall";
const getParam = (value: string | string[] | undefined): string | undefined => Array.isArray(value) ? value[0] : value;
const getId = (params: { id?: string | string[] }): number | null => {
  const id = Number(getParam(params.id));
  return Number.isInteger(id) && id > 0 ? id : null;
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  const id = getId(params);
  if (!id) return json({ error: "ID foto tidak valid." }, 400);
  if (!(await isAuthorized(request, env.ADMIN_TOKEN))) return json({ error: "Unauthorized" }, 401);
  if (!env.DB) return json({ error: "D1 binding DB belum dikonfigurasi." }, 503);
  try {
    const input = await request.json() as PhotoInput;
    if (!input.src || !input.alt || !input.caption || input.caption.length > 120 || !isPhotoSize(input.size ?? "regular")) {
      return json({ error: "src, alt, caption <= 120 karakter, dan size wajib valid." }, 400);
    }

    const sets = ["src = ?", "alt = ?", "caption = ?", "size = ?", "sort_order = ?", "is_published = ?"];
    const values: (string | number | null)[] = [
      input.src, input.alt, input.caption, input.size ?? "regular", input.sort_order ?? 0, input.is_published === false ? 0 : 1
    ];

    for (const [key, max] of OPTIONAL_FIELDS) {
      if (!(key in input)) continue;
      const raw = input[key];
      let value: string | null;
      if (raw === null || raw === "") {
        value = null;
      } else if (typeof raw !== "string" || raw.length > max) {
        throw new RangeError(key);
      } else {
        value = raw.trim() || null;
      }
      if (key === "taken_at" && value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value)))) {
        return json({ error: "Tanggal harus berformat YYYY-MM-DD." }, 400);
      }
      sets.push(`${key} = ?`);
      values.push(value);
    }

    const result = await env.DB.prepare(
      `UPDATE photos SET ${sets.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).bind(...values, id).run();
    return result.meta.changes ? json({ message: "Foto diperbarui." }) : json({ error: "Foto tidak ditemukan." }, 404);
  } catch (error) {
    console.error("PUT /api/admin/photos/:id failed", error);
    if (error instanceof RangeError) return json({ error: `Isian ${error.message} terlalu panjang.` }, 400);
    return json({ error: "Payload JSON tidak valid atau update gagal. Jika baru memakai tanggal, lokasi, atau cerita, pastikan migrasi 0004 dan 0005 sudah dijalankan." }, 400);
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  const id = getId(params);
  if (!id) return json({ error: "ID foto tidak valid." }, 400);
  if (!(await isAuthorized(request, env.ADMIN_TOKEN))) return json({ error: "Unauthorized" }, 401);
  if (!env.DB) return json({ error: "D1 binding DB belum dikonfigurasi." }, 503);
  const row = await env.DB.prepare("SELECT src FROM photos WHERE id = ?").bind(id).first<{ src: string }>();
  if (!row) return json({ error: "Foto tidak ditemukan." }, 404);

  const statements = [env.DB.prepare("DELETE FROM photos WHERE id = ?").bind(id)];
  const match = /^\/api\/img\/([0-9a-f-]{36})$/.exec(row.src);
  if (match) statements.push(env.DB.prepare("DELETE FROM photo_files WHERE id = ?").bind(match[1]));
  await env.DB.batch(statements);
  return json({ message: "Foto dihapus." });
};
