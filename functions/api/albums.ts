import { isAdminRequest, type AdminEnv } from "../_lib/auth";
import { getAlbums } from "../_lib/albums";

type Env = AdminEnv & { DB: D1Database };

// Publik: album foto yang tampil di situs. Admin (dengan token) mendapat semua foto, termasuk yang disembunyikan.
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const isAdmin = await isAdminRequest(request, env);
  return new Response(JSON.stringify(await getAlbums(env.DB, !isAdmin)), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
};
