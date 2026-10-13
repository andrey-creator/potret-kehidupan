import { json } from "../_lib/auth";
import { PUBLIC_COLUMN_SETS, queryWithFallback } from "../_lib/photos";

type Env = {
  DB: D1Database;
};

const publicJson = (body: unknown, status = 200): Response =>
  json(body, status, status === 200 ? "public, max-age=60" : "no-store");

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  if (!env.DB) return publicJson({ error: "D1 binding DB belum dikonfigurasi." }, 503);
  try {
    const results = await queryWithFallback(PUBLIC_COLUMN_SETS, (columns) => env.DB.prepare(
      `SELECT ${columns} FROM photos WHERE is_published = 1 ORDER BY sort_order ASC, id ASC`
    ));
    return publicJson(results);
  } catch (error) {
    console.error("GET /api/photos failed", error);
    return publicJson({ error: "Gagal membaca galeri." }, 500);
  }
};
