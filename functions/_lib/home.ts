// Menyisipkan canonical, hreflang, og:url, dan og:image ke halaman utama (Indonesia atau Inggris)
// berdasarkan foto unggulan (foto pertama di galeri). Crawler WhatsApp, Instagram, X, dsb. tidak
// menjalankan JavaScript, jadi tag ini harus ada di HTML awal.

import { alternateLinks, homePath, Lang, pick } from "./i18n";
import { homeTexts } from "./site";

type Env = {
  DB?: D1Database;
};

type Cover = {
  src: string;
  alt: string;
  alt_en?: string | null;
  width?: number | null;
  height?: number | null;
};

const escapeAttr = (value: string): string =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

async function firstPhoto(db: D1Database): Promise<Cover | null> {
  const queries = [
    "SELECT src, alt, alt_en, width, height FROM photos WHERE is_published = 1 ORDER BY sort_order ASC, id ASC LIMIT 1",
    "SELECT src, alt, width, height FROM photos WHERE is_published = 1 ORDER BY sort_order ASC, id ASC LIMIT 1",
    "SELECT src, alt FROM photos WHERE is_published = 1 ORDER BY sort_order ASC, id ASC LIMIT 1"
  ];
  for (const sql of queries) {
    try {
      return await db.prepare(sql).first<Cover>();
    } catch {
      // Migrasi yang lebih baru belum dijalankan: coba kueri yang lebih sederhana.
    }
  }
  return null;
}

export async function serveHome(request: Request, env: Env, next: () => Promise<Response>, lang: Lang): Promise<Response> {
  const response = await next();
  if (!response.headers.get("content-type")?.includes("text/html")) return response;

  const origin = new URL(request.url).origin;
  const url = `${origin}${homePath(lang)}`;
  const tags = [
    `<link rel="canonical" href="${url}">`,
    alternateLinks(origin, homePath("id"), homePath("en")),
    `<meta property="og:url" content="${url}">`
  ];

  const cover = env.DB ? await firstPhoto(env.DB) : null;
  if (cover) {
    const image = new URL(cover.src, origin).href;
    tags.push(`<meta property="og:image" content="${escapeAttr(image)}">`);
    tags.push(`<meta property="og:image:alt" content="${escapeAttr(pick(lang, cover.alt, cover.alt_en))}">`);
    if (cover.width && cover.height) {
      tags.push(`<meta property="og:image:width" content="${cover.width}">`);
      tags.push(`<meta property="og:image:height" content="${cover.height}">`);
    }
    tags.push(`<meta name="twitter:image" content="${escapeAttr(image)}">`);
  }

  // Kalimat pembuka dan paragraf pengantar yang diubah dari admin menggantikan teks bawaan di HTML awal.
  const texts = await homeTexts(env.DB, lang);

  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.set("cache-control", "public, max-age=60");

  return new HTMLRewriter()
    .on("head", { element(head) { head.append(`\n  ${tags.join("\n  ")}\n`, { html: true }); } })
    .on("p.intro-note", { element(element) { if (texts.customNote) element.setInnerContent(texts.note); } })
    .on("p.intro-lede", { element(element) { if (texts.customLede) element.setInnerContent(texts.lede); } })
    .transform(new Response(response.body, { status: response.status, headers }));
}
