import type { Photo } from "./types.js";

type Lang = "id" | "en";

const isLocalPreview = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
const lang: Lang = document.documentElement.lang === "en" ? "en" : "id";

const TEXT = {
  id: {
    months: ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"],
    date: (day: number, month: string, year: string) => `${day} ${month} ${year}`,
    viewPhoto: (caption: string) => `Lihat foto: ${caption}`,
    viewFeatured: (caption: string) => `Lihat foto unggulan: ${caption}`,
    featuredTag: "Pilihan",
    hint: "Klik untuk melihat",
    loadFailed: "Galeri belum bisa dimuat. Muat ulang halaman beberapa saat lagi.",
    empty: "Belum ada momen yang ditampilkan.",
    share: "Bagikan",
    copied: "Tautan disalin.",
    copyManually: "Salin dari kolom alamat browser."
  },
  en: {
    months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    date: (day: number, month: string, year: string) => `${month} ${day}, ${year}`,
    viewPhoto: (caption: string) => `View photo: ${caption}`,
    viewFeatured: (caption: string) => `View featured photo: ${caption}`,
    featuredTag: "Featured",
    hint: "Click to view",
    loadFailed: "The gallery could not be loaded. Please reload the page in a moment.",
    empty: "No moments to show yet.",
    share: "Share",
    copied: "Link copied.",
    copyManually: "Copy it from the browser address bar."
  }
}[lang];

const gallery = document.querySelector<HTMLElement>("#gallery");
const featured = document.querySelector<HTMLElement>("#featured");
const loading = document.querySelector<HTMLElement>("#galleryLoading");
const galleryCount = document.querySelector<HTMLElement>("#galleryCount");
const lightbox = document.querySelector<HTMLElement>("#lightbox");
const lightboxImage = document.querySelector<HTMLImageElement>("#lightboxImage");
const lightboxCaption = document.querySelector<HTMLElement>("#lightboxCaption");
const lightboxCount = document.querySelector<HTMLElement>("#lightboxCount");
const lightboxMeta = document.querySelector<HTMLElement>("#lightboxMeta");
const lightboxLink = document.querySelector<HTMLAnchorElement>("#lightboxLink");
const lightboxShare = document.querySelector<HTMLButtonElement>("#lightboxShare");
const lightboxStatus = document.querySelector<HTMLElement>("#lightboxStatus");
const lightboxClose = document.querySelector<HTMLButtonElement>("#lightboxClose");
const lightboxPrevious = document.querySelector<HTMLButtonElement>("#lightboxPrevious");
const lightboxNext = document.querySelector<HTMLButtonElement>("#lightboxNext");
const lightboxBackdrop = document.querySelector<HTMLElement>("#lightboxBackdrop");

let photos: Photo[] = [];
let activeIndex = 0;
let opener: HTMLElement | null = null;
const preloaded = new Map<string, HTMLImageElement>();

const padNumber = (number: number): string => String(number).padStart(2, "0");

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

/** Teks versi bahasa; jika terjemahan Inggris kosong, pakai teks Indonesia. */
function pickText(base: string, english: string | null | undefined): string {
  const en = english?.trim();
  return lang === "en" && en ? en : base;
}

const captionOf = (item: Photo): string => pickText(item.caption, item.caption_en);
const altOf = (item: Photo): string => pickText(item.alt, item.alt_en);
const locationOf = (item: Photo): string => pickText(item.location ?? "", item.location_en).trim();
const photoUrl = (id: number): string => (lang === "en" ? `/en/photo/${id}` : `/foto/${id}`);

function formatDate(iso: string | null | undefined): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  const month = match ? TEXT.months[Number(match[2]) - 1] : undefined;
  return match && month ? TEXT.date(Number(match[3]), month, match[1]) : "";
}

// Foto yang disimpan di D1 punya versi kecil (?s=thumb) untuk grid; sumber lain dipakai apa adanya.
function thumbSrc(src: string): string {
  return /^\/api\/img\/[0-9a-f-]{36}$/.test(src) ? `${src}?s=thumb` : src;
}

function dimensions(item: Photo): { width: number; height: number } | null {
  const width = Number(item.width);
  const height = Number(item.height);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) return null;
  return { width, height };
}

function ratioStyle(item: Photo): string {
  const size = dimensions(item);
  return size ? ` width="${size.width}" height="${size.height}" style="aspect-ratio: ${size.width} / ${size.height}"` : "";
}

function renderFeatured(item: Photo): void {
  if (!featured) return;
  const size = dimensions(item);
  const sizeAttributes = size ? ` width="${size.width}" height="${size.height}"` : "";
  featured.innerHTML = `
    <button class="featured-button" type="button" aria-label="${escapeHtml(TEXT.viewFeatured(captionOf(item)))}" data-index="0">
      <img src="${escapeHtml(item.src)}" alt="${escapeHtml(altOf(item))}"${sizeAttributes} fetchpriority="high" decoding="async">
    </button>
    <figcaption class="featured-caption">
      <p>${escapeHtml(captionOf(item))}</p>
      <span>${escapeHtml(TEXT.featuredTag)}</span>
    </figcaption>
  `;
  featured.hidden = false;
}

function renderMessage(text: string, count: string): void {
  if (!gallery || !galleryCount) return;
  if (loading) loading.remove();
  galleryCount.textContent = count;
  gallery.innerHTML = `<p class="gallery-loading" role="status">${escapeHtml(text)}</p>`;
}

function renderGallery(): void {
  if (!gallery || !galleryCount) return;
  galleryCount.textContent = String(photos.length);
  if (loading) loading.remove();
  if (photos.length > 0) renderFeatured(photos[0]);
  // Foto pertama tampil di header; galeri menampilkan sisanya (kecuali hanya ada satu foto).
  const offset = photos.length > 1 ? 1 : 0;
  gallery.innerHTML = photos.slice(offset).map((item, position) => {
    const index = position + offset;
    return `
    <article class="gallery-card card border-0 rounded-0 bg-transparent is-${item.size}" data-index="${index}">
      <button class="photo-button" type="button" aria-label="${escapeHtml(TEXT.viewPhoto(captionOf(item)))}" data-index="${index}">
        <img src="${escapeHtml(thumbSrc(item.src))}" alt="${escapeHtml(altOf(item))}"${ratioStyle(item)} loading="${index < 2 ? "eager" : "lazy"}" decoding="async">
        <span class="photo-hint"><i class="bi bi-zoom-in me-1" aria-hidden="true"></i>${escapeHtml(TEXT.hint)}</span>
      </button>
      <div class="card-body photo-caption d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-baseline gap-1 gap-sm-3 px-0 pb-0 pt-3">
        <p class="card-text mb-0">${escapeHtml(captionOf(item))}</p>
        <span class="photo-number">${padNumber(index + 1)} / ${padNumber(photos.length)}</span>
      </div>
    </article>
  `;
  }).join("");

  const cards = gallery.querySelectorAll<HTMLElement>(".gallery-card");
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12 });
  cards.forEach((card, index) => {
    card.style.transitionDelay = `${Math.min(index % 4, 3) * 70}ms`;
    revealObserver.observe(card);
  });
}

// ---------- Lightbox (Bootstrap Modal) ----------
// Modal Bootstrap sudah mengurus: backdrop, tombol Esc, jebakan fokus (Tab), kunci scroll, dan animasi.
// Kode di sini hanya mengisi isi foto, navigasi kiri/kanan, geser jari, dan tombol bagikan.

const lightboxModal = lightbox ? bootstrap.Modal.getOrCreateInstance(lightbox) : null;
const isLightboxOpen = (): boolean => lightbox?.classList.contains("show") ?? false;

/** Memuat foto sebelum dan sesudah foto aktif agar perpindahan terasa instan. */
function preloadNeighbors(index: number): void {
  if (photos.length < 2) return;
  [index + 1, index - 1].forEach((i) => {
    const src = photos[(i + photos.length) % photos.length].src;
    if (preloaded.has(src)) return;
    const image = new Image();
    image.decoding = "async";
    image.src = src;
    preloaded.set(src, image);
  });
}

function setStatus(text: string): void {
  if (lightboxStatus) lightboxStatus.textContent = text;
}

function showLightbox(index: number, trigger?: HTMLElement | null): void {
  if (!lightboxModal || !lightboxImage || !lightboxCaption || !lightboxCount || photos.length === 0) return;
  const wasClosed = !isLightboxOpen();
  if (wasClosed) opener = trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
  activeIndex = (index + photos.length) % photos.length;
  const item = photos[activeIndex];
  lightboxImage.src = item.src;
  lightboxImage.alt = altOf(item);
  lightboxCaption.textContent = captionOf(item);
  lightboxCount.textContent = `${padNumber(activeIndex + 1)} / ${padNumber(photos.length)}`;
  if (lightboxMeta) {
    lightboxMeta.textContent = [formatDate(item.taken_at), locationOf(item)].filter(Boolean).join(" · ");
    lightboxMeta.hidden = !lightboxMeta.textContent;
  }
  if (lightboxLink) {
    lightboxLink.hidden = !item.id;
    if (item.id) lightboxLink.href = photoUrl(item.id);
  }
  if (lightboxShare) lightboxShare.hidden = !item.id;
  setStatus("");
  if (wasClosed) lightboxModal.show(trigger ?? undefined);
  preloadNeighbors(activeIndex);
}

/** Fokus kembali ke foto yang sedang dilihat (atau yang diklik semula) agar pengguna keyboard tidak "tersesat". */
function restoreFocus(): void {
  const current = activeIndex === 0
    ? document.querySelector<HTMLElement>(".featured-button")
    : document.querySelector<HTMLElement>(`.photo-button[data-index="${activeIndex}"]`);
  const target = current ?? opener;
  if (target && target.isConnected) target.focus();
  opener = null;
}

function moveLightbox(step: number): void { showLightbox(activeIndex + step); }

async function shareCurrent(): Promise<void> {
  const item = photos[activeIndex];
  if (!item?.id) return;
  const url = `${location.origin}${photoUrl(item.id)}`;
  const data = { title: `${captionOf(item)} — Potret Kehidupan`, url };
  try {
    if (navigator.share) {
      await navigator.share(data);
    } else if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      setStatus(TEXT.copied);
    } else {
      setStatus(TEXT.copyManually);
    }
  } catch (error) {
    // Pengguna membatalkan dialog bagikan: bukan kesalahan. Kegagalan menyalin diberi petunjuk manual.
    if ((error as DOMException)?.name !== "AbortError") setStatus(TEXT.copyManually);
  }
}

// Geser jari di layar sentuh: kiri = foto berikutnya, kanan = sebelumnya.
const SWIPE_DISTANCE = 50;
let touchStart: { x: number; y: number } | null = null;

lightboxBackdrop?.addEventListener("touchstart", (event) => {
  const touch = event.touches[0];
  touchStart = event.touches.length === 1 && touch ? { x: touch.clientX, y: touch.clientY } : null;
}, { passive: true });

lightboxBackdrop?.addEventListener("touchend", (event) => {
  const touch = event.changedTouches[0];
  if (!touchStart || !touch) return;
  const dx = touch.clientX - touchStart.x;
  const dy = touch.clientY - touchStart.y;
  touchStart = null;
  if (Math.abs(dx) >= SWIPE_DISTANCE && Math.abs(dx) > Math.abs(dy) * 1.5) moveLightbox(dx < 0 ? 1 : -1);
}, { passive: true });

lightboxBackdrop?.addEventListener("touchcancel", () => { touchStart = null; }, { passive: true });

// ---------- Memuat data ----------

async function loadDevPhotos(): Promise<Photo[]> {
  const { fallbackPhotos } = await import("./dev-photos.js");
  return fallbackPhotos;
}

async function loadPhotos(): Promise<void> {
  try {
    const response = await fetch("/api/photos", { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`API ${response.status}`);
    photos = await response.json() as Photo[];
  } catch (error) {
    console.error("Galeri gagal dimuat.", error);
    if (isLocalPreview) {
      photos = await loadDevPhotos();
    } else {
      renderMessage(TEXT.loadFailed, "—");
      return;
    }
  }
  if (photos.length === 0) {
    if (isLocalPreview) {
      photos = await loadDevPhotos();
    } else {
      renderMessage(TEXT.empty, "0");
      return;
    }
  }
  renderGallery();
}

featured?.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>(".featured-button");
  if (button) showLightbox(0, button);
});
gallery?.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>(".photo-button");
  if (button) showLightbox(Number(button.dataset.index), button);
});
lightboxPrevious?.addEventListener("click", () => moveLightbox(-1));
lightboxNext?.addEventListener("click", () => moveLightbox(1));
lightboxShare?.addEventListener("click", () => { void shareCurrent(); });
// Klik area gelap di sekitar foto menutup modal (tombol X dan Esc ditangani Bootstrap).
lightbox?.addEventListener("click", (event) => {
  const target = event.target as HTMLElement;
  if (target === lightboxBackdrop || target.matches(".modal, .modal-dialog, .modal-content, .lightbox-body")) lightboxModal?.hide();
});
lightbox?.addEventListener("shown.bs.modal", () => lightboxClose?.focus());
lightbox?.addEventListener("hidden.bs.modal", () => {
  lightboxImage?.removeAttribute("src");
  restoreFocus();
});
document.addEventListener("keydown", (event) => {
  if (!isLightboxOpen()) return;
  if (event.key === "ArrowLeft") moveLightbox(-1);
  if (event.key === "ArrowRight") moveLightbox(1);
});

const year = String(new Date().getFullYear());
const currentYear = document.querySelector<HTMLElement>("#currentYear");
const footerYear = document.querySelector<HTMLElement>("#footerYear");
if (currentYear) currentYear.textContent = year;
if (footerYear) footerYear.textContent = year;
void loadPhotos();
