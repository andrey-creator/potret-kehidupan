// Membuat public/index.html (Indonesia) dan public/en/index.html (Inggris) dari SATU templat,
// sehingga struktur kedua halaman selalu sama dan hanya teksnya yang berbeda.
// Jalankan setelah mengubah templat atau teks:  node scripts/generate-pages.mjs
// (Hasilnya sudah ada di repository; Cloudflare tidak perlu menjalankan skrip ini.)

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

// Teks bawaan kalimat pembuka dan paragraf pengantar: config/site-text.json (juga dipakai server dan halaman admin).
const DEFAULTS = JSON.parse(readFileSync("config/site-text.json", "utf8"));

const INSTAGRAM = "https://www.instagram.com/andreyson_hamilton_a";
const YOUTUBE = "https://youtube.com/@aryasatyakeandre";

const TEXT = {
  id: {
    lang: "id",
    locale: "id_ID",
    homePath: "/",
    title: "Potret Kehidupan — Kepingan hidup dalam gambar.",
    description: "Potret Kehidupan — kepingan hidup dalam gambar.",
    ogDescription: "Kepingan hidup dalam gambar.",
    injectedBy: "functions/index.ts",
    skip: "Lewati ke galeri",
    navLabel: "Navigasi utama",
    toggler: "Buka menu navigasi",
    navGallery: "Galeri",
    langLabel: "Bahasa / Language",
    metaLeft: "Album pribadi",
    metaRight: "Jurnal visual · ",
    note: DEFAULTS.id.note,
    ledeComment: "Teks bawaan kalimat pembuka dan paragraf pengantar: config/site-text.json. Bisa diubah dari halaman /admin tanpa deploy.",
    lede: DEFAULTS.id.lede,
    more: "Lihat semua momen",
    featuredComment: "Foto unggulan diisi otomatis dari foto pertama di galeri.",
    headingLeft: "Fragmen yang disimpan",
    headingCountSuffix: "momen",
    slideshow: "Putar slideshow",
    galleryLabel: "Galeri foto Potret Kehidupan",
    loading: "Memuat momen…",
    loadMore: "Muat lebih banyak",
    filterLabel: "Saring galeri",
    filterLocation: "Lokasi",
    filterYear: "Tahun",
    filterReset: "Atur ulang",
    footerLinks: "Tautan media sosial",
    lightboxLabel: "Tampilan foto besar",
    close: "Tutup tampilan foto",
    openPage: "Buka halaman foto",
    readMore: "Baca selengkapnya",
    share: "Bagikan",
    photoNav: "Navigasi foto",
    prev: "Foto sebelumnya",
    next: "Foto berikutnya",
    play: "Putar slideshow",
    pause: "Jeda slideshow",
    toastClose: "Tutup pesan"
  },
  en: {
    lang: "en",
    locale: "en_US",
    homePath: "/en/",
    title: "Potret Kehidupan — Fragments of life, in pictures.",
    description: "Potret Kehidupan — fragments of life, in pictures.",
    ogDescription: "Fragments of life, in pictures.",
    injectedBy: "functions/en/index.ts",
    skip: "Skip to gallery",
    navLabel: "Main navigation",
    toggler: "Open navigation menu",
    navGallery: "Gallery",
    langLabel: "Bahasa / Language",
    metaLeft: "Personal album",
    metaRight: "Visual journal · ",
    note: DEFAULTS.en.note,
    ledeComment: "Teks bawaan (Inggris): config/site-text.json. Bisa diubah dari halaman /admin tanpa deploy.",
    lede: DEFAULTS.en.lede,
    more: "See all moments",
    featuredComment: "Foto unggulan diisi otomatis dari foto pertama di galeri.",
    headingLeft: "Saved fragments",
    headingCountSuffix: "moments",
    slideshow: "Play slideshow",
    galleryLabel: "Potret Kehidupan photo gallery",
    loading: "Loading moments…",
    loadMore: "Load more",
    filterLabel: "Filter gallery",
    filterLocation: "Location",
    filterYear: "Year",
    filterReset: "Reset",
    footerLinks: "Social media links",
    lightboxLabel: "Enlarged photo view",
    close: "Close photo view",
    openPage: "Open photo page",
    readMore: "Read more",
    share: "Share",
    photoNav: "Photo navigation",
    prev: "Previous photo",
    next: "Next photo",
    play: "Play slideshow",
    pause: "Pause slideshow",
    toastClose: "Close message"
  }
};

function page(t) {
  const isId = t.lang === "id";
  return `<!doctype html>
<!-- File ini dibuat oleh scripts/generate-pages.mjs (satu templat untuk versi Indonesia dan Inggris).
     Ubah teks atau struktur di skrip itu, lalu jalankan: npm run generate:pages -->
<html lang="${t.lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${t.description}">
  <meta name="theme-color" content="#f1eee8">
  <title>${t.title}</title>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <!-- og:image, og:url, canonical, dan hreflang disisipkan otomatis oleh ${t.injectedBy} dari foto unggulan. -->
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Potret Kehidupan">
  <meta property="og:title" content="Potret Kehidupan">
  <meta property="og:description" content="${t.ogDescription}">
  <meta property="og:locale" content="${t.locale}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="stylesheet" href="/assets/vendor/bootstrap.min.css">
  <link rel="stylesheet" href="/assets/vendor/bootstrap-icons/bootstrap-icons.min.css">
  <link rel="stylesheet" href="/assets/styles.css">
</head>
<body id="top">
  <a class="visually-hidden-focusable skip-link" href="#gallery">${t.skip}</a>

  <nav class="navbar navbar-expand-md sticky-top site-navbar" aria-label="${t.navLabel}">
    <div class="shell d-flex flex-wrap align-items-center justify-content-between">
      <a class="navbar-brand m-0" href="#top">Potret Kehidupan</a>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#siteNav" aria-controls="siteNav" aria-expanded="false" aria-label="${t.toggler}">
        <i class="bi bi-list fs-3" aria-hidden="true"></i>
      </button>
      <div class="collapse navbar-collapse justify-content-md-end" id="siteNav">
        <ul class="navbar-nav align-items-md-center gap-md-4 pt-3 pt-md-0">
          <li class="nav-item"><a class="nav-link" href="#gallery"><i class="bi bi-images me-2" aria-hidden="true"></i>${t.navGallery}</a></li>
          <li class="nav-item"><a class="nav-link" href="${INSTAGRAM}" target="_blank" rel="noreferrer"><i class="bi bi-instagram me-2" aria-hidden="true"></i>Instagram</a></li>
          <li class="nav-item"><a class="nav-link" href="${YOUTUBE}" target="_blank" rel="noreferrer"><i class="bi bi-youtube me-2" aria-hidden="true"></i>YouTube</a></li>
          <li class="nav-item">
            <span class="nav-link lang-switch" role="group" aria-label="${t.langLabel}">
              <i class="bi bi-translate me-1" aria-hidden="true"></i>
              <a href="/" hreflang="id" lang="id"${isId ? ' aria-current="true"' : ""}>ID</a>
              <a href="/en/" hreflang="en" lang="en"${isId ? "" : ' aria-current="true"'}>EN</a>
            </span>
          </li>
        </ul>
      </div>
    </div>
  </nav>

  <header class="site-header shell">
    <div class="header-meta d-flex align-items-center justify-content-between gap-3 pt-2 text-uppercase">
      <span>${t.metaLeft}</span>
      <span>${t.metaRight}<span id="currentYear">2026</span></span>
    </div>
    <div class="header-intro">
      <div class="intro-copy">
        <h1>Potret<br>Kehidupan</h1>
        <p class="intro-note">${t.note}</p>
        <!-- ${t.ledeComment} -->
        <p class="intro-lede">${t.lede}</p>
        <a class="btn btn-ink mt-4" href="#gallery">${t.more}<i class="bi bi-arrow-down ms-2" aria-hidden="true"></i></a>
      </div>
      <!-- ${t.featuredComment} -->
      <figure class="featured" id="featured" hidden></figure>
    </div>
  </header>

  <main class="gallery-section shell">
    <div class="gallery-heading d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3 text-uppercase">
      <p class="mb-0" aria-hidden="true">${t.headingLeft}</p>
      <div class="d-flex align-items-center gap-3">
        <p class="mb-0" aria-hidden="true"><span id="galleryCount">—</span> ${t.headingCountSuffix}</p>
        <button class="btn btn-ink btn-slideshow" id="slideshowStart" type="button" hidden><i class="bi bi-play-fill me-1" aria-hidden="true"></i>${t.slideshow}</button>
      </div>
    </div>
    <div class="gallery-filters" id="galleryFilters" role="group" aria-label="${t.filterLabel}" hidden>
      <label class="filter"><span>${t.filterLocation}</span><select id="filterLocation" class="form-select form-select-sm rounded-0"></select></label>
      <label class="filter"><span>${t.filterYear}</span><select id="filterYear" class="form-select form-select-sm rounded-0"></select></label>
      <button class="btn btn-ink" id="filterReset" type="button" hidden>${t.filterReset}</button>
    </div>
    <section class="gallery" id="gallery" aria-label="${t.galleryLabel}">
      <div class="gallery-loading" id="galleryLoading" role="status">${t.loading}</div>
    </section>
    <div class="load-more" id="loadMoreWrap" hidden>
      <p class="load-more-status" id="loadMoreStatus" role="status" aria-live="polite"></p>
      <button class="btn btn-ink" id="loadMore" type="button">${t.loadMore}<i class="bi bi-plus-lg ms-2" aria-hidden="true"></i></button>
    </div>
  </main>

  <footer class="site-footer shell">
    <div class="footer-rule"></div>
    <div class="footer-meta d-flex flex-column flex-sm-row align-items-start justify-content-between gap-3 pt-3">
      <span class="footer-name">Aryasatya Keandre · <span id="footerYear">2026</span></span>
      <nav class="footer-links d-flex flex-wrap gap-3 justify-content-sm-end" aria-label="${t.footerLinks}">
        <a class="social-link" href="${INSTAGRAM}" target="_blank" rel="noreferrer"><i class="bi bi-instagram me-1" aria-hidden="true"></i>Instagram</a>
        <a class="social-link" href="${YOUTUBE}" target="_blank" rel="noreferrer"><i class="bi bi-youtube me-1" aria-hidden="true"></i>YouTube</a>
      </nav>
    </div>
  </footer>

  <div class="modal fade lightbox-modal" id="lightbox" tabindex="-1" aria-label="${t.lightboxLabel}" aria-hidden="true" data-bs-theme="dark">
    <div class="modal-dialog modal-fullscreen">
      <div class="modal-content">
        <div class="progress lightbox-progress" id="lightboxProgressWrap" role="presentation" hidden>
          <div class="progress-bar slideshow-bar" id="lightboxProgress"></div>
        </div>
        <div class="modal-body">
          <div class="lightbox-panel">
            <button class="btn btn-outline-light rounded-circle lightbox-close" id="lightboxClose" type="button" data-bs-dismiss="modal" aria-label="${t.close}"><i class="bi bi-x-lg" aria-hidden="true"></i></button>
            <div class="lightbox-image-wrap" id="lightboxBackdrop">
              <img class="lightbox-image" id="lightboxImage" src="" alt="">
            </div>
            <div class="lightbox-side">
              <p class="lightbox-caption" id="lightboxCaption"></p>
              <p class="lightbox-meta" id="lightboxMeta" hidden></p>
              <div class="lightbox-story" id="lightboxStory" hidden>
                <p id="lightboxStoryText"></p>
                <a class="lightbox-readmore" id="lightboxReadMore" href="#" hidden>${t.readMore}<i class="bi bi-arrow-right ms-1" aria-hidden="true"></i></a>
              </div>
              <a class="lightbox-link" id="lightboxLink" href="#" hidden>${t.openPage}<i class="bi bi-box-arrow-up-right ms-1" aria-hidden="true"></i></a>
              <button class="btn btn-ink-light lightbox-share" id="lightboxShare" type="button" hidden><i class="bi bi-share me-2" aria-hidden="true"></i>${t.share}</button>
              <p class="lightbox-count" id="lightboxCount"></p>
              <div class="lightbox-controls d-flex gap-2" role="group" aria-label="${t.photoNav}">
                <button class="btn btn-outline-light rounded-circle lightbox-control" id="lightboxPrevious" type="button" aria-label="${t.prev}"><i class="bi bi-arrow-left" aria-hidden="true"></i></button>
                <button class="btn btn-outline-light rounded-circle lightbox-control" id="lightboxPlay" type="button" aria-pressed="false" aria-label="${t.play}" data-label-play="${t.play}" data-label-pause="${t.pause}"><i class="bi bi-play-fill" aria-hidden="true"></i></button>
                <button class="btn btn-outline-light rounded-circle lightbox-control" id="lightboxNext" type="button" aria-label="${t.next}"><i class="bi bi-arrow-right" aria-hidden="true"></i></button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="toast-container position-fixed bottom-0 start-50 translate-middle-x p-3">
    <div class="toast align-items-center text-bg-dark border-0" id="shareToast" role="status" aria-live="polite" aria-atomic="true" data-bs-delay="3200">
      <div class="d-flex">
        <div class="toast-body"><i class="bi bi-check-circle me-2" aria-hidden="true"></i><span id="shareToastText"></span></div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="${t.toastClose}"></button>
      </div>
    </div>
  </div>

  <script src="/assets/vendor/bootstrap.bundle.min.js"></script>
  <script type="module" src="/assets/app.js"></script>
</body>
</html>
`;
}

mkdirSync("public/en", { recursive: true });
writeFileSync("public/index.html", page(TEXT.id));
writeFileSync("public/en/index.html", page(TEXT.en));
console.log("public/index.html dan public/en/index.html dibuat.");
