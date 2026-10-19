// Navbar Bootstrap untuk halaman yang dirender di server. Strukturnya sama dengan halaman statis
// (dibuat oleh scripts/generate-pages.mjs); ubah keduanya bersamaan.

import { homePath, Lang } from "./i18n";

export const INSTAGRAM_URL = "https://www.instagram.com/andreyson_hamilton_a";
export const YOUTUBE_URL = "https://youtube.com/@aryasatyakeandre";
// Jurnal tulisan pendamping (proyek terpisah). Samakan dengan scripts/generate-pages.mjs.
export const CATATAN_URL = "https://catatan-kehidupan.pages.dev/";

const LABELS: Record<Lang, { nav: string; toggler: string; gallery: string; writing: string; lang: string }> = {
  id: { nav: "Navigasi utama", toggler: "Buka menu navigasi", gallery: "Galeri", writing: "Tulisan", lang: "Bahasa / Language" },
  en: { nav: "Main navigation", toggler: "Open navigation menu", gallery: "Gallery", writing: "Writing", lang: "Bahasa / Language" }
};

const escapeAttr = (value: string): string => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");

/** `switchTo` berisi alamat halaman yang sama dalam dua bahasa, untuk tombol ID | EN. */
export function renderNavbar(lang: Lang, switchTo: { id: string; en: string }): string {
  const t = LABELS[lang];
  const home = homePath(lang);
  return `<nav class="navbar navbar-expand-md sticky-top site-navbar" aria-label="${t.nav}">
    <div class="shell d-flex flex-wrap align-items-center justify-content-between">
      <a class="navbar-brand m-0" href="${home}">Potret Kehidupan</a>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#siteNav" aria-controls="siteNav" aria-expanded="false" aria-label="${t.toggler}">
        <i class="bi bi-list fs-3" aria-hidden="true"></i>
      </button>
      <div class="collapse navbar-collapse justify-content-md-end" id="siteNav">
        <ul class="navbar-nav align-items-md-center gap-md-4 pt-3 pt-md-0">
          <li class="nav-item"><a class="nav-link" href="${home}#gallery"><i class="bi bi-images me-2" aria-hidden="true"></i>${t.gallery}</a></li>
          <li class="nav-item"><a class="nav-link" href="${CATATAN_URL}" target="_blank" rel="noopener"><i class="bi bi-journal-text me-2" aria-hidden="true"></i>${t.writing}</a></li>
          <li class="nav-item"><a class="nav-link" href="${INSTAGRAM_URL}" target="_blank" rel="noreferrer"><i class="bi bi-instagram me-2" aria-hidden="true"></i>Instagram</a></li>
          <li class="nav-item"><a class="nav-link" href="${YOUTUBE_URL}" target="_blank" rel="noreferrer"><i class="bi bi-youtube me-2" aria-hidden="true"></i>YouTube</a></li>
          <li class="nav-item">
            <span class="nav-link lang-switch" role="group" aria-label="${t.lang}">
              <i class="bi bi-translate me-1" aria-hidden="true"></i>
              <a href="${escapeAttr(switchTo.id)}" hreflang="id" lang="id"${lang === "id" ? ' aria-current="true"' : ""}>ID</a>
              <a href="${escapeAttr(switchTo.en)}" hreflang="en" lang="en"${lang === "en" ? ' aria-current="true"' : ""}>EN</a>
            </span>
          </li>
        </ul>
      </div>
    </div>
  </nav>`;
}
