// Login admin sederhana: token rahasia di variabel lingkungan ADMIN_TOKEN (Cloudflare Pages → Settings → Variables and Secrets).
// Jika ADMIN_TOKEN belum diisi, semua permintaan admin ditolak (aman secara bawaan).

export type AdminEnv = { ADMIN_TOKEN?: string };

async function digest(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

/** Perbandingan waktu-tetap lewat hash SHA-256 agar panjang token tidak bocor. */
export async function isAdminRequest(request: Request, env: AdminEnv): Promise<boolean> {
  const secret = env.ADMIN_TOKEN?.trim();
  if (!secret) return false;
  const match = /^Bearer\s+(.+)$/i.exec(request.headers.get("Authorization") ?? "");
  if (!match) return false;
  const [a, b] = await Promise.all([digest(match[1].trim()), digest(secret)]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
