import { getAlbums } from "./albums";
import { getSettings } from "./gallery-settings";
import { alternateLinks, formatDate, homePath, Lang, pick, photoPath, STRINGS } from "./i18n";
import { renderNavbar } from "./navbar";
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

type OrderRow = { id: number; caption: string; caption_en?: string | null; taken_at?: string | null };

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
  let albums: Awaited<ReturnType<typeof getAlbums>> = {};
  let galleryOrder = "default";
  try {
    [photo] = await queryWithFallback<DetailPhoto>(DETAIL_COLUMN_SETS, (columns) => env.DB.prepare(
      `SELECT ${columns} FROM photos WHERE id = ? AND is_published = 1`
    ).bind(id));
    if (!photo) return notFound(request, env);
    order = await queryWithFallback<OrderRow>(
      ["id, caption, caption_en, taken_at", "id, caption, caption_en", "id, caption"],
      (columns) => env.DB.prepare(`SELECT ${columns} FROM photos WHERE is_published = 1 ORDER BY sort_order ASC, id ASC`)
    );
    // Album dan urutan galeri hanya pelengkap: jika gagal dimuat, halaman tetap tampil dengan urutan bawaan.
    [albums, galleryOrder] = await Promise.all([
      getAlbums(env.DB, true),
      getSettings(env.DB).then((settings) => settings.gallery_order as string)
    ]);
  } catch (error) {
    console.error("GET photo page failed", error);
    return new Response("Terjadi kesalahan saat memuat halaman. / Something went wrong.", { status: 500 });
  }

  // Urutan yang sama dengan galeri di beranda (urutan acak tidak bisa ditiru, jadi memakai urutan bawaan).
  if (galleryOrder === "newest" || galleryOrder === "oldest") {
    const sign = galleryOrder === "oldest" ? 1 : -1;
    order = order
      .map((item, position) => ({ item, position }))
      .sort((a, b) => {
        const x = a.item.taken_at ?? "";
        const y = b.item.taken_at ?? "";
        if (x && !y) return -1;
        if (!x && y) return 1;
        if (x && y && x !== y) return (x < y ? -1 : 1) * sign;
        return a.position - b.position;
      })
      .map(({ item }) => item);
  }

  // Konteks album: foto sebelumnya/berikutnya dan penghitung hanya dari album yang sama (tanpa album = semua foto).
  const albumOf = (photoId: number): string => {
    const entry = albums[String(photoId)];
    return entry ? pick(lang, entry.album, entry.album_en).trim() : "";
  };
  const albumName = albumOf(photo.id);
  const scope = albumName
    ? order.filter((item) => albumOf(item.id).toLowerCase() === albumName.toLowerCase())
    : order;

  const origin = new URL(request.url).origin;
  const index = scope.findIndex((item) => item.id === photo.id);
  const previous = index > 0 ? scope[index - 1] : undefined;
  const next = index >= 0 && index < scope.length - 1 ? scope[index + 1] : undefined;
  const backHref = albumName
    ? `${homePath(lang)}?album=${encodeURIComponent(albumName)}#gallery`
    : t.galleryLink;
  const backLabel = albumName ? t.backToAlbum(albumName) : t.back;

  const caption = pick(lang, photo.caption, photo.caption_en);
  const alt = pick(lang, photo.alt, photo.alt_en);
  const location = pick(lang, photo.location, photo.location_en).trim();
  const story = pick(lang, photo.story, photo.story_en).trim();
  const dateText = formatDate(lang, photo.taken_at);
  const meta = [dateText, location].filter(Boolean).join(" · ");
  const metaHtml = [
    dateText ? `<span><i class="bi bi-calendar3" aria-hidden="true"></i> ${escapeHtml(dateText)}</span>` : "",
    location ? `<span><i class="bi bi-geo-alt" aria-hidden="true"></i> ${escapeHtml(location)}</span>` : ""
  ].join("");
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
  <link rel="stylesheet" href="/assets/vendor/bootstrap-icons/bootstrap-icons.min.css">
  <link rel="stylesheet" href="/assets/styles.css">
  <script src="/assets/theme.js"></script>
</head>
<body>
  ${renderNavbar(lang, { id: photoPath("id", photo.id), en: photoPath("en", photo.id) })}
  <main class="shell photo-view">
    <nav class="photo-nav d-flex align-items-baseline justify-content-between gap-3" aria-label="${escapeHtml(t.navLabel)}">
      <a class="photo-back" href="${escapeHtml(backHref)}"><i class="bi bi-arrow-left me-2" aria-hidden="true"></i>${escapeHtml(backLabel)}</a>
      ${index >= 0 ? `<span>${pad(index + 1)} / ${pad(scope.length)}</span>` : ""}
    </nav>
    <figure class="photo-figure">
      <img src="${escapeHtml(photo.src)}" alt="${escapeHtml(alt)}"${sizeAttributes} decoding="async" fetchpriority="high">
    </figure>
    <section class="photo-info">
      <h1 class="photo-title">${escapeHtml(caption)}</h1>
      ${metaHtml ? `<p class="photo-meta">${metaHtml}</p>` : ""}
      ${story ? `<div class="photo-story">
        ${storyHtml(story)}
      </div>` : ""}
      <div class="d-flex align-items-center gap-3 mt-4">
        <button class="btn btn-ink" id="shareButton" type="button"><i class="bi bi-share me-2" aria-hidden="true"></i>${escapeHtml(t.share)}</button>
        <span class="photo-share-status" id="shareStatus" role="status"></span>
      </div>
    </section>
    <nav class="photo-pager d-flex justify-content-between gap-3" aria-label="${escapeHtml(t.pagerLabel)}">
      ${previous ? `<a class="prev" rel="prev" href="${photoPath(lang, previous.id)}"><span class="pager-label"><i class="bi bi-arrow-left me-1" aria-hidden="true"></i>${escapeHtml(t.previous)}</span><span class="pager-caption">${neighborCaption(previous)}</span></a>` : "<span></span>"}
      ${next ? `<a class="next" rel="next" href="${photoPath(lang, next.id)}"><span class="pager-label">${escapeHtml(t.next)}<i class="bi bi-arrow-right ms-1" aria-hidden="true"></i></span><span class="pager-caption">${neighborCaption(next)}</span></a>` : ""}
    </nav>
  </main>
  <div class="toast-container position-fixed bottom-0 start-50 translate-middle-x p-3">
    <div class="toast align-items-center text-bg-dark border-0" id="shareToast" role="status" aria-live="polite" aria-atomic="true" data-bs-delay="3200">
      <div class="d-flex">
        <div class="toast-body"><i class="bi bi-check-circle me-2" aria-hidden="true"></i><span id="shareToastText"></span></div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="${escapeHtml(t.closeMessage)}"></button>
      </div>
    </div>
  </div>
  <script src="/assets/vendor/bootstrap.bundle.min.js"></script>
  <script>
    (function () {
      var button = document.getElementById("shareButton");
      var status = document.getElementById("shareStatus");
      var toast = document.getElementById("shareToast");
      var toastText = document.getElementById("shareToastText");
      // Panah kiri/kanan pindah ke foto sebelumnya/berikutnya (tidak aktif saat mengetik atau memakai tombol modifier).
      document.addEventListener("keydown", function (event) {
        if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
        var target = event.target;
        if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
        var link = document.querySelector(event.key === "ArrowLeft" ? ".photo-pager a[rel=prev]" : event.key === "ArrowRight" ? ".photo-pager a[rel=next]" : "");
        if (link) location.href = link.href;
      });
      if (!button) return;
      var copied = ${JSON.stringify(t.copied)};
      var manual = ${JSON.stringify(t.copyManually)};
      function tell(message) {
        if (window.bootstrap && toast && toastText) {
          toastText.textContent = message;
          window.bootstrap.Toast.getOrCreateInstance(toast).show();
        } else {
          status.textContent = message;
        }
      }
      button.addEventListener("click", function () {
        var data = { title: document.title, url: location.href };
        if (navigator.share) {
          navigator.share(data).catch(function () {});
        } else if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(location.href).then(function () { tell(copied); }, function () { tell(manual); });
        } else {
          tell(manual);
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
