import { DETAIL_COLUMN_SETS, queryWithFallback } from "../_lib/photos";

type Env = {
  DB: D1Database;
  ASSETS: Fetcher;
};

type DetailPhoto = {
  id: number;
  src: string;
  alt: string;
  caption: string;
  width?: number | null;
  height?: number | null;
  taken_at?: string | null;
  location?: string | null;
  story?: string | null;
};

const getParam = (value: string | string[] | undefined): string | undefined => Array.isArray(value) ? value[0] : value;

const escapeHtml = (value: string): string => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

const formatDate = (iso: string | null | undefined): string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  if (!match) return "";
  const month = MONTHS[Number(match[2]) - 1];
  return month ? `${Number(match[3])} ${month} ${match[1]}` : "";
};

const pad = (value: number): string => String(value).padStart(2, "0");

const notFound = async (request: Request, env: Env): Promise<Response> => {
  const page = await env.ASSETS.fetch(new URL("/404.html", request.url));
  return new Response(page.body, { status: 404, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
};

const storyHtml = (story: string): string => story
  .split(/\n{2,}/)
  .map((paragraph) => paragraph.trim())
  .filter(Boolean)
  .map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br>")}</p>`)
  .join("\n        ");

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const id = Number(getParam(params.id));
  if (!Number.isInteger(id) || id <= 0 || !env.DB) return notFound(request, env);

  let photo: DetailPhoto | undefined;
  let order: { id: number; caption: string }[] = [];
  try {
    [photo] = await queryWithFallback<DetailPhoto>(DETAIL_COLUMN_SETS, (columns) => env.DB.prepare(
      `SELECT ${columns} FROM photos WHERE id = ? AND is_published = 1`
    ).bind(id));
    if (!photo) return notFound(request, env);
    ({ results: order } = await env.DB.prepare(
      "SELECT id, caption FROM photos WHERE is_published = 1 ORDER BY sort_order ASC, id ASC"
    ).all<{ id: number; caption: string }>());
  } catch (error) {
    console.error("GET /foto/:id failed", error);
    return new Response("Terjadi kesalahan saat memuat halaman.", { status: 500 });
  }

  const origin = new URL(request.url).origin;
  const index = order.findIndex((item) => item.id === photo.id);
  const previous = index > 0 ? order[index - 1] : undefined;
  const next = index >= 0 && index < order.length - 1 ? order[index + 1] : undefined;

  const date = formatDate(photo.taken_at);
  const meta = [date, photo.location?.trim() ?? ""].filter(Boolean).join(" · ");
  const story = photo.story?.trim() ?? "";
  const description = story ? story.replace(/\s+/g, " ").slice(0, 200) : (meta || "Potret Kehidupan — kepingan hidup dalam gambar.");
  const imageUrl = photo.src.startsWith("/") ? `${origin}${photo.src}` : photo.src;
  const pageUrl = `${origin}/foto/${photo.id}`;
  const title = `${photo.caption} — Potret Kehidupan`;
  const sizeAttributes = photo.width && photo.height ? ` width="${photo.width}" height="${photo.height}"` : "";

  const html = `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="theme-color" content="#f1eee8">
  <link rel="canonical" href="${escapeHtml(pageUrl)}">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Potret Kehidupan">
  <meta property="og:title" content="${escapeHtml(photo.caption)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(pageUrl)}">
  <meta property="og:image" content="${escapeHtml(imageUrl)}">
  <meta property="og:locale" content="id_ID">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="stylesheet" href="/assets/styles.css">
</head>
<body>
  <main class="shell photo-view">
    <nav class="photo-nav" aria-label="Navigasi halaman foto">
      <a href="/#gallery">← Galeri</a>
      <span>${index >= 0 ? `${pad(index + 1)} / ${pad(order.length)}` : ""}</span>
    </nav>
    <figure class="photo-figure">
      <img src="${escapeHtml(photo.src)}" alt="${escapeHtml(photo.alt)}"${sizeAttributes} decoding="async" fetchpriority="high">
    </figure>
    <section class="photo-info">
      <h1 class="photo-title">${escapeHtml(photo.caption)}</h1>
      ${meta ? `<p class="photo-meta">${escapeHtml(meta)}</p>` : ""}
      ${story ? `<div class="photo-story">
        ${storyHtml(story)}
      </div>` : ""}
      <div class="photo-actions">
        <button class="photo-share" id="shareButton" type="button">Bagikan</button>
        <span class="photo-share-status" id="shareStatus" role="status"></span>
      </div>
    </section>
    <nav class="photo-pager" aria-label="Foto lainnya">
      ${previous ? `<a class="prev" rel="prev" href="/foto/${previous.id}">← ${escapeHtml(previous.caption)}</a>` : "<span></span>"}
      ${next ? `<a class="next" rel="next" href="/foto/${next.id}">${escapeHtml(next.caption)} →</a>` : ""}
    </nav>
  </main>
  <script>
    (function () {
      var button = document.getElementById("shareButton");
      var status = document.getElementById("shareStatus");
      if (!button) return;
      button.addEventListener("click", function () {
        var data = { title: document.title, url: location.href };
        if (navigator.share) {
          navigator.share(data).catch(function () {});
        } else if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(location.href).then(function () {
            status.textContent = "Tautan disalin.";
          }, function () { status.textContent = "Salin dari kolom alamat browser."; });
        } else {
          status.textContent = "Salin dari kolom alamat browser.";
        }
      });
    })();
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=60" }
  });
};
