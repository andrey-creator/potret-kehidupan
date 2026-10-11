import { alternateLinks, formatDate, homePath, Lang, pick, photoPath, STRINGS } from "./i18n";
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

/** Navbar sticky yang sama dengan halaman utama; pilihan bahasa menunjuk ke versi halaman foto ini. */
const siteNav = (lang: Lang, photoId: number): string => {
  const t = STRINGS[lang];
  return `<nav class="navbar navbar-expand-md sticky-top site-nav" aria-label="${escapeHtml(t.navMain)}">
    <div class="container-fluid shell">
      <a class="navbar-brand site-brand" href="${homePath(lang)}">Potret Kehidupan</a>
      <button class="navbar-toggler border-0 shadow-none px-0" type="button" data-bs-toggle="collapse" data-bs-target="#siteMenu" aria-controls="siteMenu" aria-expanded="false" aria-label="${escapeHtml(t.toggleMenu)}">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="siteMenu">
        <ul class="navbar-nav ms-md-auto align-items-md-center gap-md-4 pt-3 pt-md-0">
          <li class="nav-item"><a class="nav-link px-0" href="${t.galleryLink}"><i class="bi bi-images me-1" aria-hidden="true"></i>${escapeHtml(t.navGallery)}</a></li>
          <li class="nav-item"><a class="nav-link px-0" href="https://www.instagram.com/andreyson_hamilton_a" target="_blank" rel="noreferrer"><i class="bi bi-instagram me-1" aria-hidden="true"></i>Instagram</a></li>
          <li class="nav-item"><a class="nav-link px-0" href="https://youtube.com/@aryasatyakeandre" target="_blank" rel="noreferrer"><i class="bi bi-youtube me-1" aria-hidden="true"></i>YouTube</a></li>
          <li class="nav-item">
            <div class="lang-switch" role="group" aria-label="Bahasa / Language">
              <a href="${photoPath("id", photoId)}"${lang === "id" ? ' aria-current="true"' : ""} hreflang="id" lang="id">ID</a>
              <a href="${photoPath("en", photoId)}"${lang === "en" ? ' aria-current="true"' : ""} hreflang="en" lang="en">EN</a>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </nav>`;
};

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
  <link rel="stylesheet" href="/assets/vendor/bootstrap.min.css">
  <link rel="stylesheet" href="/assets/vendor/bootstrap-icons.min.css">
  <link rel="stylesheet" href="/assets/styles.css">
</head>
<body>
  ${siteNav(lang, photo.id)}
  <main class="shell photo-view">
    <nav class="photo-nav" aria-label="${escapeHtml(t.navLabel)}">
      <a href="${t.galleryLink}"><i class="bi bi-arrow-left me-1" aria-hidden="true"></i>${escapeHtml(t.back)}</a>
      ${index >= 0 ? `<span>${pad(index + 1)} / ${pad(order.length)}</span>` : ""}
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
      <div class="photo-actions d-flex align-items-center gap-3 mt-4">
        <button class="btn btn-outline-dark btn-site rounded-0" id="shareButton" type="button"><i class="bi bi-share me-2" aria-hidden="true"></i>${escapeHtml(t.share)}</button>
        <span class="photo-share-status" id="shareStatus" role="status"></span>
      </div>
    </section>
    <nav class="photo-pager" aria-label="${escapeHtml(t.pagerLabel)}">
      ${previous ? `<a class="prev" rel="prev" href="${photoPath(lang, previous.id)}"><i class="bi bi-arrow-left me-1" aria-hidden="true"></i>${neighborCaption(previous)}</a>` : "<span></span>"}
      ${next ? `<a class="next" rel="next" href="${photoPath(lang, next.id)}">${neighborCaption(next)}<i class="bi bi-arrow-right ms-1" aria-hidden="true"></i></a>` : ""}
    </nav>
  </main>
  <script src="/assets/vendor/bootstrap.bundle.min.js" defer></script>
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
