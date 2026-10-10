import { json } from "../../_lib/auth";

type Env = {
  DB: D1Database;
};

const getParam = (value: string | string[] | undefined): string | undefined => Array.isArray(value) ? value[0] : value;

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const id = Number(getParam(params.id));
  if (!Number.isInteger(id) || id <= 0 || !env.DB) return json({ error: "Foto tidak ditemukan." }, 404);
  // Hanya foto yang sudah dipublikasikan; draf tidak boleh terbaca publik.
  const row = await env.DB.prepare(
    "SELECT id, src, alt, caption, size, sort_order FROM photos WHERE id = ? AND is_published = 1"
  ).bind(id).first();
  return row ? json(row, 200, "public, max-age=60") : json({ error: "Foto tidak ditemukan." }, 404);
};
