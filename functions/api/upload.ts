type Env = {
  PHOTOS: R2Bucket;
  ADMIN_TOKEN?: string;
};

const json = (body: unknown, status = 200): Response => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const expected = env.ADMIN_TOKEN;
  const received = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!expected || !received || received !== expected) return json({ error: "Unauthorized" }, 401);
  if (!env.PHOTOS) return json({ error: "R2 binding PHOTOS belum dikonfigurasi." }, 503);

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return json({ error: "Field file wajib diisi." }, 400);
  if (!file.type.startsWith("image/")) return json({ error: "File harus berupa gambar." }, 400);
  if (file.size > 10 * 1024 * 1024) return json({ error: "Ukuran maksimum file adalah 10 MiB." }, 413);

  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const key = `gallery/${crypto.randomUUID()}.${extension}`;
  await env.PHOTOS.put(key, file.stream(), { httpMetadata: { contentType: file.type } });
  return json({ key, src: `/api/media/${key}`, message: "Foto berhasil diunggah ke R2." }, 201);
};
