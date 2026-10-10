type Env = {
  DB: D1Database;
};

const notFound = (): Response => new Response("Not found", { status: 404 });
const getParam = (value: string | string[] | undefined): string | undefined => Array.isArray(value) ? value[0] : value;

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const id = getParam(params.id);
  if (!id || !env.DB || !/^[0-9a-f-]{36}$/.test(id)) return notFound();

  const row = await env.DB.prepare("SELECT mime, data FROM photo_files WHERE id = ?").bind(id).first<{ mime: string; data: string }>();
  if (!row) return notFound();

  const binary = atob(row.data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);

  return new Response(bytes, {
    headers: {
      "content-type": row.mime,
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff"
    }
  });
};
