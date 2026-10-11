import { alternateLinks, formatDate, Lang, pick, photoPath, STRINGS } from "./i18n";
import { DETAIL_COLUMN_SETS, queryWithFallback } from "./photos";

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
  caption_en?: string | null;
  alt_en?: string | null;
  location_en?: string | null;
  story_en?: string | null;
};

type OrderRow = { id: number; caption: string; caption_en?: string | null };

const escapeHtml = (value: string): string => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

const pad = (value: number): string => String(value).padStart(2, "0");

export const notFound = async (request: Request, env: Env): Promise<Response> => {
  const page = await env.ASSETS.fetch(new URL("/404.html", request.url));
  return new Response(page.body, { status: 404, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
};

const storyHtml = (story: string): string => story
  .split(/\n{2,}/)
  .map((paragraph) => paragraph.trim())
  .filter(Boolean)
  .map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br>")}</p>`)
  .join("\n        ");

export async function renderPhotoPage(request: Request, env: Env, rawId: string | string[] | undefined, lang: Lang): Promise<Response> {
  const id = Number(Array.isArray(rawId) ? rawId[0] : rawId);
  if (!Number.isInteger(id) || id <= 0 || !env.DB) return notFound(request, env);
  const t = STRINGS[lang];

  let photo: DetailPhoto | undefined;
  let order: OrderRow[] = [];
  try {
    [photo] = await queryWithFallback<DetailPhoto>(DETAIL_COLUMN_SETS, (columns) => env.DB.prepare(
      `SELECT ${columns} FROM photos WHERE id = ? AND is_published = 1`
    ).bind(id));
    if (!photo) return notFound(request, env);
    order = await queryWithFallback<OrderRow>(
      ["id, caption, caption_en", "id, caption"],
      (columns) => env.DB.prepare(`SELECT ${columns} FROM photos WHERE is_published = 1 ORDER BY sort_order ASC, id ASC`)
    );
  } catch (error) {
    console.error("GET photo page failed", error);
    return new Response("Terjadi kesalahan saat memuat halaman. / Something went wrong.", { status: 500 });
  }

  const origin = new URL(request.url).origin;
  const index = order.findIndex((item) => item.id === photo.id);
  const previous = index > 0 ? order[index - 1] : undefined;
  const next = index >= 0 && index < order.length - 1 ? order[index + 1] : undefined;

  const caption = pick(lang, photo.caption, photo.caption_en);
  const alt = pick(lang, photo.alt, photo.alt_en);
  const location = pick(lang, photo.location, photo.location_en).trim();
  const story = pick(lang, photo.story, photo.story_en).trim();
  const meta = [formatDate(lang, photo.taken_at), location].filter(Boolean).join(" · ");
  const description = story ? story.replace(/\s+/g, " ").slice(0, 200) : (meta || t.homeDescription);
  const imageUrl = photo.src.startsWith("/") ? `${origin}${photo.src}` : photo.src;
  const pageUrl = `${origin}${photoPath(lang, photo.id)}`;
  const title = `${caption} — Potret Kehidupan`;
  const sizeAttributes = photo.width && photo.height ? ` width="${photo.width}" height="${photo.height}"` : "";
  const neighborCaption = (row: OrderRow): string => escapeHtml(pick(lang, row.caption, row.caption_en));

  const html = `<!doctype html>
<html lang="${t.htmlLang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="theme-color" content="#f1eee8">
  <link rel="canonical" href="${escapeHtml(pageUrl)}">
  ${alternateLinks(origin, photoPath("id", photo.id), photoPath("en", photo.id))}
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Potret Kehidupan">
  <meta property="og:title" content="${escapeHtml(caption)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(pageUrl)}">
  <meta property="og:image" content="${escapeHtml(imageUrl)}">
  <meta property="og:locale" content="${t.locale}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="stylesheet" href="/assets/styles.css">
</head>
<body>
  <main class="shell photo-view">
    <nav class="photo-nav" aria-label="${escapeHtml(t.navLabel)}">
      <a href="${t.galleryLink}">${escapeHtml(t.back)}</a>
      <span class="photo-nav-right">
        ${index >= 0 ? `<span>${pad(index + 1)} / ${pad(order.length)}</span>` : ""}
        <span class="lang-switch" aria-label="Language / Bahasa">
          <a href="${photoPath("id", photo.id)}"${lang === "id" ? ' aria-current="true"' : ""} hreflang="id" lang="id">ID</a>
          <a href="${photoPath("en", photo.id)}"${lang === "en" ? ' aria-current="true"' : ""} hreflang="en" lang="en">EN</a>
        </span>
      </span>
    </nav>
    <figure class="photo-figure">
      <img src="${escapeHtml(photo.src)}" alt="${escapeHtml(alt)}"${sizeAttributes} decoding="async" fetchpriority="high">
    </figure>
    <section class="photo-info">
      <h1 class="photo-title">${escapeHtml(caption)}</h1>
      ${meta ? `<p class="photo-meta">${escapeHtml(meta)}</p>` : ""}
      ${story ? `<div class="photo-story">
        ${storyHtml(story)}
      </div>` : ""}
      <div class="photo-actions">
        <button class="photo-share" id="shareButton" type="button">${escapeHtml(t.share)}</button>
        <span class="photo-share-status" id="shareStatus" role="status"></span>
      </div>
    </section>
    <nav class="photo-pager" aria-label="${escapeHtml(t.pagerLabel)}">
      ${previous ? `<a class="prev" rel="prev" href="${photoPath(lang, previous.id)}">← ${neighborCaption(previous)}</a>` : "<span></span>"}
      ${next ? `<a class="next" rel="next" href="${photoPath(lang, next.id)}">${neighborCaption(next)} →</a>` : ""}
    </nav>
  </main>
  <script>
    (function () {
      var button = document.getElementById("shareButton");
      var status = document.getElementById("shareStatus");
      if (!button) return;
      var copied = ${JSON.stringify(t.copied)};
      var manual = ${JSON.stringify(t.copyManually)};
      button.addEventListener("click", function () {
        var data = { title: document.title, url: location.href };
        if (navigator.share) {
          navigator.share(data).catch(function () {});
        } else if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(location.href).then(function () {
            status.textContent = copied;
          }, function () { status.textContent = manual; });
        } else {
          status.textContent = manual;
        }
      });
    })();
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=60" }
  });
}
