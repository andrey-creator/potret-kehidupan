import { isAuthorized, json } from "../../_lib/auth";

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

const isPhotoSize = (value: unknown): value is PhotoSize => value === "regular" || value === "wide" || value === "tall";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await isAuthorized(request, env.ADMIN_TOKEN))) return json({ error: "Unauthorized" }, 401);
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
    console.error("POST /api/admin/photos failed", error);
    return json({ error: "Payload JSON tidak valid atau insert gagal." }, 400);
  }
};
