// Menyisipkan og:image / og:url ke index.html berdasarkan foto unggulan (foto pertama di galeri).
// Crawler WhatsApp, Instagram, X, dsb. tidak menjalankan JavaScript, jadi tag ini harus ada di HTML awal.

type Env = {
  DB?: D1Database;
};

type Cover = {
  src: string;
  alt: string;
  width?: number | null;
  height?: number | null;
};

const escapeAttr = (value: string): string =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

async function firstPhoto(db: D1Database): Promise<Cover | null> {
  try {
    return await db.prepare(
      "SELECT src, alt, width, height FROM photos WHERE is_published = 1 ORDER BY sort_order ASC, id ASC LIMIT 1"
    ).first<Cover>();
  } catch {
    try {
      // Migrasi 0003 (width/height) belum dijalankan.
      return await db.prepare(
        "SELECT src, alt FROM photos WHERE is_published = 1 ORDER BY sort_order ASC, id ASC LIMIT 1"
      ).first<Cover>();
    } catch {
      return null;
    }
  }
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, next }) => {
  const response = await next();
  if (!response.headers.get("content-type")?.includes("text/html")) return response;

  const origin = new URL(request.url).origin;
  const tags = [
    `<link rel="canonical" href="${origin}/">`,
    `<meta property="og:url" content="${origin}/">`
  ];

  const cover = env.DB ? await firstPhoto(env.DB) : null;
  if (cover) {
    const image = new URL(cover.src, origin).href;
    tags.push(`<meta property="og:image" content="${escapeAttr(image)}">`);
    tags.push(`<meta property="og:image:alt" content="${escapeAttr(cover.alt)}">`);
    if (cover.width && cover.height) {
      tags.push(`<meta property="og:image:width" content="${cover.width}">`);
      tags.push(`<meta property="og:image:height" content="${cover.height}">`);
    }
    tags.push(`<meta name="twitter:image" content="${escapeAttr(image)}">`);
  }

  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.set("cache-control", "public, max-age=60");

  return new HTMLRewriter()
    .on("head", { element(head) { head.append(`\n  ${tags.join("\n  ")}\n`, { html: true }); } })
    .transform(new Response(response.body, { status: response.status, headers }));
};
