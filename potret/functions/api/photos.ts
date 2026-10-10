import { json } from "../_lib/auth";

type Env = {
  DB: D1Database;
};

const publicJson = (body: unknown, status = 200): Response =>
  json(body, status, status === 200 ? "public, max-age=60" : "no-store");

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  if (!env.DB) return publicJson({ error: "D1 binding DB belum dikonfigurasi." }, 503);
  try {
    try {
      const { results } = await env.DB.prepare(
        "SELECT id, src, alt, caption, size, sort_order, width, height FROM photos WHERE is_published = 1 ORDER BY sort_order ASC, id ASC"
      ).all();
      return publicJson(results);
    } catch {
      // Kolom width/height belum ada (migrasi 0003 belum dijalankan): tetap tampilkan galeri.
      const { results } = await env.DB.prepare(
        "SELECT id, src, alt, caption, size, sort_order FROM photos WHERE is_published = 1 ORDER BY sort_order ASC, id ASC"
      ).all();
      return publicJson(results);
    }
  } catch (error) {
    console.error("GET /api/photos failed", error);
    return publicJson({ error: "Gagal membaca galeri." }, 500);
  }
};
