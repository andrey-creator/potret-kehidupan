import { isAuthorized, json } from "../../_lib/auth";

type Env = {
  PHOTOS: R2Bucket;
  ADMIN_TOKEN?: string;
};

// Hanya format raster. SVG sengaja ditolak karena bisa memuat skrip jika disajikan dari origin yang sama.
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await isAuthorized(request, env.ADMIN_TOKEN))) return json({ error: "Unauthorized" }, 401);
  if (!env.PHOTOS) return json({ error: "R2 binding PHOTOS belum dikonfigurasi." }, 503);

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return json({ error: "Field file wajib diisi." }, 400);
  if (!ALLOWED_TYPES.includes(file.type)) return json({ error: "Format harus JPEG, PNG, WebP, atau AVIF." }, 400);
  if (file.size > 10 * 1024 * 1024) return json({ error: "Ukuran maksimum file adalah 10 MiB." }, 413);

  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const key = `gallery/${crypto.randomUUID()}.${extension}`;
  await env.PHOTOS.put(key, file.stream(), { httpMetadata: { contentType: file.type } });
  return json({ key, src: `/api/media/${key}`, message: "Foto berhasil diunggah ke R2." }, 201);
};
