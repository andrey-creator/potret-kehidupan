type Env = {
  DB: D1Database;
};

const notFound = (): Response => new Response("Not found", { status: 404 });
const getParam = (value: string | string[] | undefined): string | undefined => Array.isArray(value) ? value[0] : value;

const imageResponse = (base64: string, mime: string, cacheControl: string): Response => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Response(bytes, {
    headers: { "content-type": mime, "cache-control": cacheControl, "x-content-type-options": "nosniff" }
  });
};

const IMMUTABLE = "public, max-age=31536000, immutable";

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const id = getParam(params.id);
  if (!id || !env.DB || !/^[0-9a-f-]{36}$/.test(id)) return notFound();

  // ?s=thumb meminta versi kecil untuk grid galeri.
  if (new URL(request.url).searchParams.get("s") === "thumb") {
    try {
      const row = await env.DB.prepare("SELECT thumb FROM photo_files WHERE id = ?").bind(id).first<{ thumb: string | null }>();
      if (row?.thumb) return imageResponse(row.thumb, "image/jpeg", IMMUTABLE);
    } catch {
      // Kolom thumb belum ada (migrasi 0004 belum dijalankan): pakai file penuh di bawah.
    }
    // Belum ada thumbnail: sajikan file penuh dengan cache singkat supaya thumbnail baru cepat terpakai.
    const full = await env.DB.prepare("SELECT mime, data FROM photo_files WHERE id = ?").bind(id).first<{ mime: string; data: string }>();
    return full ? imageResponse(full.data, full.mime, "public, max-age=300") : notFound();
  }

  const row = await env.DB.prepare("SELECT mime, data FROM photo_files WHERE id = ?").bind(id).first<{ mime: string; data: string }>();
  return row ? imageResponse(row.data, row.mime, IMMUTABLE) : notFound();
};

// HEAD (dipakai pemeriksa tautan dan beberapa crawler) dijawab seperti GET; runtime membuang isi respons.
export const onRequestHead = onRequestGet;
