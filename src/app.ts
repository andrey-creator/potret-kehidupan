import type { Photo } from "./types.js";

type Lang = "id" | "en";

// Bootstrap dimuat sebagai skrip biasa (public/index.html) dan tersedia sebagai variabel global.
type BsModal = { show(): void; hide(): void };
type BsToast = { show(): void };
declare const bootstrap: {
  Modal: { getOrCreateInstance(element: Element): BsModal };
  Toast: { getOrCreateInstance(element: Element): BsToast };
} | undefined;

const isLocalPreview = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
const lang: Lang = document.documentElement.lang === "en" ? "en" : "id";
const reduceMotion = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

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
    copied: "Link copied.",
    copyManually: "Copy it from the browser address bar."
  }
}[lang];

const SLIDE_MS = 4500; // harus sama dengan --slideshow-interval di styles.css
const REVEALS = ["left", "up", "right", "clip"] as const;

const gallery = document.querySelector<HTMLElement>("#gallery");
const featured = document.querySelector<HTMLElement>("#featured");
const loading = document.querySelector<HTMLElement>("#galleryLoading");
const galleryCount = document.querySelector<HTMLElement>("#galleryCount");
const slideshowStart = document.querySelector<HTMLButtonElement>("#slideshowStart");
const lightbox = document.querySelector<HTMLElement>("#lightbox");
const lightboxImage = document.querySelector<HTMLImageElement>("#lightboxImage");
const lightboxCaption = document.querySelector<HTMLElement>("#lightboxCaption");
const lightboxCount = document.querySelector<HTMLElement>("#lightboxCount");
const lightboxMeta = document.querySelector<HTMLElement>("#lightboxMeta");
const lightboxLink = document.querySelector<HTMLAnchorElement>("#lightboxLink");
const lightboxShare = document.querySelector<HTMLButtonElement>("#lightboxShare");
const lightboxClose = document.querySelector<HTMLButtonElement>("#lightboxClose");
const lightboxPrevious = document.querySelector<HTMLButtonElement>("#lightboxPrevious");
const lightboxNext = document.querySelector<HTMLButtonElement>("#lightboxNext");
const lightboxPlay = document.querySelector<HTMLButtonElement>("#lightboxPlay");
const lightboxProgress = document.querySelector<HTMLElement>("#lightboxProgress");
const lightboxProgressWrap = document.querySelector<HTMLElement>("#lightboxProgressWrap");
const lightboxBackdrop = document.querySelector<HTMLElement>("#lightboxBackdrop");
const shareToast = document.querySelector<HTMLElement>("#shareToast");
const shareToastText = document.querySelector<HTMLElement>("#shareToastText");

let photos: Photo[] = [];
let activeIndex = 0;
let lightboxOpen = false;
let opener: HTMLElement | null = null;
let playing = false;
let slideTimer: number | undefined;
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

/** Hanya data URI gambar kecil yang diterima sebagai pratinjau buram. */
function safeBlur(value: string | null | undefined): string | null {
  return value && /^data:image\/(jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value) ? value : null;
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

function metaSpans(item: Photo): { icon: string; text: string }[] {
  return [
    { icon: "bi-calendar3", text: formatDate(item.taken_at) },
    { icon: "bi-geo-alt", text: locationOf(item) }
  ].filter((part) => part.text);
}

function renderFeatured(item: Photo): void {
  if (!featured) return;
  const size = dimensions(item);
  const sizeAttributes = size ? ` width="${size.width}" height="${size.height}"` : "";
  featured.innerHTML = `
    <button class="featured-button" type="button" aria-label="${escapeHtml(TEXT.viewFeatured(captionOf(item)))}" data-index="0">
      <img src="${escapeHtml(item.src)}" alt="${escapeHtml(altOf(item))}"${sizeAttributes} fetchpriority="high" decoding="async">
    </button>
    <figcaption class="featured-caption d-flex align-items-baseline justify-content-between gap-3 pt-3">
      <p>${escapeHtml(captionOf(item))}</p>
      <span class="text-uppercase">${escapeHtml(TEXT.featuredTag)}</span>
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

function renderCard(item: Photo, index: number): string {
  const meta = metaSpans(item)
    .map((part) => `<span><i class="bi ${part.icon}" aria-hidden="true"></i> ${escapeHtml(part.text)}</span>`)
    .join("");
  return `
    <article class="card gallery-card is-${item.size} border-0 rounded-0 bg-transparent" data-index="${index}" data-reveal="${REVEALS[index % REVEALS.length]}">
      <button class="photo-button" type="button" aria-label="${escapeHtml(TEXT.viewPhoto(captionOf(item)))}" data-index="${index}">
        <img class="card-img-top rounded-0" src="${escapeHtml(thumbSrc(item.src))}" alt="${escapeHtml(altOf(item))}"${ratioStyle(item)} loading="${index < 2 ? "eager" : "lazy"}" decoding="async">
        <span class="photo-overlay" aria-hidden="true">
          <span class="photo-overlay-caption">${escapeHtml(captionOf(item))}</span>
          <span class="photo-overlay-meta">${meta}</span>
          <span class="photo-hint"><i class="bi bi-zoom-in" aria-hidden="true"></i> ${escapeHtml(TEXT.hint)}</span>
        </span>
      </button>
      <div class="card-body px-0 pb-0 pt-3 d-sm-flex align-items-sm-baseline justify-content-sm-between gap-3 photo-caption">
        <p class="card-text mb-0">${escapeHtml(captionOf(item))}</p>
        <span class="photo-number d-block d-sm-inline mt-1 mt-sm-0">${padNumber(index + 1)} / ${padNumber(photos.length)}</span>
      </div>
    </article>
  `;
}

/** Pratinjau buram sebagai latar, lalu foto asli muncul perlahan begitu selesai dimuat. */
function setupImageLoading(): void {
  gallery?.querySelectorAll<HTMLButtonElement>(".photo-button").forEach((button) => {
    const item = photos[Number(button.dataset.index)];
    const blur = safeBlur(item?.blur);
    if (blur) button.style.setProperty("--blur", `url("${blur}")`);
    const image = button.querySelector("img");
    if (!image) return;
    const done = (): void => button.classList.add("is-loaded");
    if (image.complete && image.naturalWidth > 0) {
      done();
    } else {
      image.addEventListener("load", done, { once: true });
      image.addEventListener("error", done, { once: true }); // jangan biarkan foto rusak tak terlihat
    }
  });
}

/** Parallax tipis: kartu bergeser maksimum 12 px, arah berlawanan antar kartu bersebelahan. */
function setupParallax(cards: HTMLElement[]): void {
  if (reduceMotion || cards.length === 0) return;
  const visible = new Set<HTMLElement>();
  let ticking = false;

  // Posisi halaman dihitung dari offsetTop (tidak terpengaruh transform/translate), agar tidak saling memengaruhi.
  const pageTop = (element: HTMLElement): number => {
    let top = 0;
    let node: HTMLElement | null = element;
    while (node) {
      top += node.offsetTop;
      node = node.offsetParent as HTMLElement | null;
    }
    return top;
  };

  const update = (): void => {
    ticking = false;
    const viewport = window.innerHeight;
    visible.forEach((card) => {
      const center = pageTop(card) + card.offsetHeight / 2 - window.scrollY;
      const delta = (center - viewport / 2) / viewport; // sekitar -1 sampai 1
      const direction = Number(card.dataset.index) % 2 === 0 ? 1 : -1;
      const offset = Math.max(-12, Math.min(12, -delta * 26 * direction));
      card.style.setProperty("--parallax-y", `${offset.toFixed(1)}px`);
    });
  };
  const schedule = (): void => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const card = entry.target as HTMLElement;
      if (entry.isIntersecting) visible.add(card); else visible.delete(card);
    });
    schedule();
  }, { rootMargin: "20% 0px" });
  cards.forEach((card) => observer.observe(card));
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
}

function renderGallery(): void {
  if (!gallery || !galleryCount) return;
  galleryCount.textContent = String(photos.length);
  if (loading) loading.remove();
  if (photos.length > 0) renderFeatured(photos[0]);
  // Foto pertama tampil di header; galeri menampilkan sisanya (kecuali hanya ada satu foto).
  const offset = photos.length > 1 ? 1 : 0;
  gallery.innerHTML = photos.slice(offset).map((item, position) => renderCard(item, position + offset)).join("");
  setupImageLoading();

  const cards = Array.from(gallery.querySelectorAll<HTMLElement>(".gallery-card"));
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
  setupParallax(cards);

  if (slideshowStart) slideshowStart.hidden = photos.length < 2 || typeof bootstrap === "undefined";
}

// ---------- Lightbox (Bootstrap Modal) ----------

function getModal(): BsModal | null {
  return lightbox && typeof bootstrap !== "undefined" ? bootstrap.Modal.getOrCreateInstance(lightbox) : null;
}

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

function notify(message: string): void {
  if (!shareToast || !shareToastText || typeof bootstrap === "undefined") return;
  shareToastText.textContent = message;
  bootstrap.Toast.getOrCreateInstance(shareToast).show();
}

function setMeta(item: Photo): void {
  if (!lightboxMeta) return;
  lightboxMeta.textContent = "";
  metaSpans(item).forEach((part) => {
    const span = document.createElement("span");
    const icon = document.createElement("i");
    icon.className = `bi ${part.icon}`;
    icon.setAttribute("aria-hidden", "true");
    span.append(icon, document.createTextNode(part.text));
    lightboxMeta.append(span);
  });
  lightboxMeta.hidden = lightboxMeta.childElementCount === 0;
}

function showLightbox(index: number, trigger?: HTMLElement | null): void {
  if (!lightboxImage || !lightboxCaption || !lightboxCount || photos.length === 0) return;
  const modal = getModal();
  const wrapped = (index + photos.length) % photos.length;
  if (!modal) {
    // Tanpa JavaScript Bootstrap: buka halaman foto yang dirender di server.
    const id = photos[wrapped].id;
    if (id) location.href = photoUrl(id);
    return;
  }
  if (!lightboxOpen) opener = trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
  activeIndex = wrapped;
  const item = photos[activeIndex];
  lightboxImage.src = item.src;
  lightboxImage.alt = altOf(item);
  lightboxCaption.textContent = captionOf(item);
  lightboxCount.textContent = `${padNumber(activeIndex + 1)} / ${padNumber(photos.length)}`;
  setMeta(item);
  if (lightboxLink) {
    lightboxLink.hidden = !item.id;
    if (item.id) lightboxLink.href = photoUrl(item.id);
  }
  if (lightboxShare) lightboxShare.hidden = !item.id;
  preloadNeighbors(activeIndex);
  if (playing) scheduleSlide();
  if (!lightboxOpen) {
    lightboxOpen = true;
    modal.show();
  }
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

function closeLightbox(): void {
  getModal()?.hide();
}

function moveLightbox(step: number): void {
  showLightbox(activeIndex + step);
}

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
      notify(TEXT.copied);
    } else {
      notify(TEXT.copyManually);
    }
  } catch (error) {
    // Pengguna membatalkan dialog bagikan: bukan kesalahan. Kegagalan menyalin diberi petunjuk manual.
    if ((error as DOMException)?.name !== "AbortError") notify(TEXT.copyManually);
  }
}

// ---------- Slideshow ----------

function setPlayUi(on: boolean): void {
  if (lightboxPlay) {
    const icon = lightboxPlay.querySelector("i");
    if (icon) icon.className = on ? "bi bi-pause-fill" : "bi bi-play-fill";
    lightboxPlay.setAttribute("aria-pressed", String(on));
    lightboxPlay.setAttribute("aria-label", (on ? lightboxPlay.dataset.labelPause : lightboxPlay.dataset.labelPlay) ?? "");
  }
  if (lightboxProgressWrap) lightboxProgressWrap.hidden = !on || reduceMotion;
}

function restartProgress(): void {
  if (!lightboxProgress) return;
  lightboxProgress.classList.remove("is-running");
  void lightboxProgress.offsetWidth; // memaksa animasi mulai dari awal
  if (playing && !document.hidden) lightboxProgress.classList.add("is-running");
}

function clearSlideTimer(): void {
  if (slideTimer !== undefined) window.clearTimeout(slideTimer);
  slideTimer = undefined;
}

function scheduleSlide(): void {
  clearSlideTimer();
  restartProgress();
  if (!playing || document.hidden) return;
  slideTimer = window.setTimeout(() => moveLightbox(1), SLIDE_MS);
}

function startSlideshow(): void {
  if (photos.length < 2) return;
  playing = true;
  setPlayUi(true);
  scheduleSlide();
}

function stopSlideshow(): void {
  playing = false;
  clearSlideTimer();
  setPlayUi(false);
  lightboxProgress?.classList.remove("is-running");
}

// ---------- Geser di layar sentuh ----------

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
slideshowStart?.addEventListener("click", () => {
  showLightbox(0, slideshowStart);
  startSlideshow();
});
lightboxPrevious?.addEventListener("click", () => moveLightbox(-1));
lightboxNext?.addEventListener("click", () => moveLightbox(1));
lightboxPlay?.addEventListener("click", () => { if (playing) stopSlideshow(); else startSlideshow(); });
lightboxShare?.addEventListener("click", () => { void shareCurrent(); });
// Klik di area kosong mengelilingi foto menutup lightbox.
lightbox?.addEventListener("click", (event) => {
  const target = event.target as HTMLElement;
  if (target === lightboxBackdrop || target.classList.contains("modal-body") || target.classList.contains("lightbox-panel")) closeLightbox();
});
// Bootstrap mengurus Esc, kunci gulir, dan jebakan fokus; di sini hanya bersih-bersih dan fokus kembali.
lightbox?.addEventListener("shown.bs.modal", () => lightboxClose?.focus());
lightbox?.addEventListener("hide.bs.modal", stopSlideshow);
lightbox?.addEventListener("hidden.bs.modal", () => {
  lightboxOpen = false;
  if (lightboxImage) lightboxImage.src = "";
  restoreFocus();
});
document.addEventListener("keydown", (event) => {
  if (!lightboxOpen) return;
  if (event.key === "ArrowLeft") moveLightbox(-1);
  if (event.key === "ArrowRight") moveLightbox(1);
});
document.addEventListener("visibilitychange", () => {
  if (playing) scheduleSlide();
});

const year = String(new Date().getFullYear());
const currentYear = document.querySelector<HTMLElement>("#currentYear");
const footerYear = document.querySelector<HTMLElement>("#footerYear");
if (currentYear) currentYear.textContent = year;
if (footerYear) footerYear.textContent = year;
void loadPhotos();
