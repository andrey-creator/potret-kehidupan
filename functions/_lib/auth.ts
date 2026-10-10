// Helper bersama untuk endpoint admin. File ini tidak mengekspor onRequest*, jadi bukan route.

const encoder = new TextEncoder();
const digest = (value: string): Promise<ArrayBuffer> => crypto.subtle.digest("SHA-256", encoder.encode(value));

/**
 * Membandingkan ADMIN_TOKEN secara constant-time (lewat hash SHA-256 agar panjang sama),
 * sehingga token tidak bisa ditebak dari selisih waktu respons.
 */
export async function isAuthorized(request: Request, expected: string | undefined): Promise<boolean> {
  const received = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!expected || !received) return false;
  const [a, b] = (await Promise.all([digest(expected), digest(received)])).map((buffer) => new Uint8Array(buffer));
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i]; // selalu 32 byte, tanpa keluar lebih awal
  return diff === 0;
}

export const json = (body: unknown, status = 200, cacheControl = "no-store"): Response => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": cacheControl }
});
