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
};

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

    // Kolom opsional: hanya diubah jika dikirim (null atau string kosong = dikosongkan).
    const optional = (key: "taken_at" | "location" | "story", max: number): string | null | undefined => {
      if (!(key in input)) return undefined;
      const raw = input[key];
      if (raw === null || raw === "") return null;
      if (typeof raw !== "string" || raw.length > max) throw new RangeError(key);
      return raw.trim() || null;
    };
    const takenAt = optional("taken_at", 10);
    if (takenAt && (!/^\d{4}-\d{2}-\d{2}$/.test(takenAt) || Number.isNaN(Date.parse(takenAt)))) {
      return json({ error: "Tanggal harus berformat YYYY-MM-DD." }, 400);
    }
    const location = optional("location", 80);
    const story = optional("story", 1200);
    if (takenAt !== undefined) { sets.push("taken_at = ?"); values.push(takenAt); }
    if (location !== undefined) { sets.push("location = ?"); values.push(location); }
    if (story !== undefined) { sets.push("story = ?"); values.push(story); }

    const result = await env.DB.prepare(
      `UPDATE photos SET ${sets.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).bind(...values, id).run();
    return result.meta.changes ? json({ message: "Foto diperbarui." }) : json({ error: "Foto tidak ditemukan." }, 404);
  } catch (error) {
    console.error("PUT /api/admin/photos/:id failed", error);
    if (error instanceof RangeError) return json({ error: `Isian ${error.message} terlalu panjang.` }, 400);
    return json({ error: "Payload JSON tidak valid atau update gagal. Jika baru memakai tanggal, lokasi, atau cerita, pastikan migrasi 0004 sudah dijalankan." }, 400);
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
