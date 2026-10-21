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
    backToGallery: "Kembali ke galeri",
    backToAlbum: (album: string) => `Kembali ke album ${album}`,
    loadFailed: "Galeri belum bisa dimuat. Muat ulang halaman beberapa saat lagi.",
    empty: "Belum ada momen yang ditampilkan.",
    copied: "Tautan disalin.",
    copyManually: "Salin dari kolom alamat browser.",
    loadMore: "Muat lebih banyak",
    shown: (shown: number, total: number) => `Menampilkan ${shown} dari ${total} momen`,
    all: "Semua",
    noMatch: "Tidak ada momen yang cocok dengan filter ini."
  },
  en: {
    months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    date: (day: number, month: string, year: string) => `${month} ${day}, ${year}`,
    viewPhoto: (caption: string) => `View photo: ${caption}`,
    viewFeatured: (caption: string) => `View featured photo: ${caption}`,
    featuredTag: "Featured",
    hint: "Click to view",
    backToGallery: "Back to gallery",
    backToAlbum: (album: string) => `Back to album ${album}`,
    loadFailed: "The gallery could not be loaded. Please reload the page in a moment.",
    empty: "No moments to show yet.",
    copied: "Link copied.",
    copyManually: "Copy it from the browser address bar.",
    loadMore: "Load more",
    shown: (shown: number, total: number) => `Showing ${shown} of ${total} moments`,
    all: "All",
    noMatch: "No moments match these filters."
  }
}[lang];

const DEFAULT_PAGE_SIZE = 12; // jumlah foto di galeri sebelum "Muat lebih banyak" (bisa diubah dari halaman admin)
const MIN_PAGE_SIZE = 1;
const MAX_PAGE_SIZE = 100;
const SLIDE_MS = 4500; // harus sama dengan --slideshow-interval di styles.css
const REVEALS = ["left", "up", "right", "clip"] as const;

const gallery = document.querySelector<HTMLElement>("#gallery");
const featured = document.querySelector<HTMLElement>("#featured");
const loading = document.querySelector<HTMLElement>("#galleryLoading");
const galleryCount = document.querySelector<HTMLElement>("#galleryCount");
const albumTabs = document.querySelector<HTMLElement>("#albumTabs");
const filtersBox = document.querySelector<HTMLElement>("#galleryFilters");
const filterLocation = document.querySelector<HTMLSelectElement>("#filterLocation");
const filterYear = document.querySelector<HTMLSelectElement>("#filterYear");
const filterReset = document.querySelector<HTMLButtonElement>("#filterReset");
const loadMoreWrap = document.querySelector<HTMLElement>("#loadMoreWrap");
const loadMoreButton = document.querySelector<HTMLButtonElement>("#loadMore");
const loadMoreStatus = document.querySelector<HTMLElement>("#loadMoreStatus");
const slideshowStart = document.querySelector<HTMLButtonElement>("#slideshowStart");
const lightbox = document.querySelector<HTMLElement>("#lightbox");
const lightboxImage = document.querySelector<HTMLImageElement>("#lightboxImage");
const lightboxCaption = document.querySelector<HTMLElement>("#lightboxCaption");
const lightboxCount = document.querySelector<HTMLElement>("#lightboxCount");
const lightboxMeta = document.querySelector<HTMLElement>("#lightboxMeta");
const lightboxStory = document.querySelector<HTMLElement>("#lightboxStory");
const lightboxStoryText = document.querySelector<HTMLElement>("#lightboxStoryText");
const lightboxReadMore = document.querySelector<HTMLAnchorElement>("#lightboxReadMore");
const lightboxLink = document.querySelector<HTMLAnchorElement>("#lightboxLink");
const lightboxShare = document.querySelector<HTMLButtonElement>("#lightboxShare");
const lightboxBackText = document.querySelector<HTMLElement>("#lightboxBackText");
const lightboxEdgePrevious = document.querySelector<HTMLButtonElement>("#lightboxEdgePrevious");
const lightboxEdgeNext = document.querySelector<HTMLButtonElement>("#lightboxEdgeNext");
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
let pageSize = DEFAULT_PAGE_SIZE;
let renderedUntil = 0; // jumlah kartu di grid yang sudah dirender
let appendCards: (cards: HTMLElement[]) => void = () => {};
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
const albumOf = (item: Photo): string => pickText(item.album ?? "", item.album_en).trim();
const storyOf = (item: Photo): string => pickText(item.story ?? "", item.story_en).replace(/\s+/g, " ").trim();
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

/** `index` = posisi di daftar lengkap (untuk lightbox); `position` = urutan kartu di grid. */
function renderCard(item: Photo, index: number, position: number): string {
  const meta = metaSpans(item)
    .map((part) => `<span><i class="bi ${part.icon}" aria-hidden="true"></i> ${escapeHtml(part.text)}</span>`)
    .join("");
  return `
    <article class="card gallery-card is-${item.size} border-0 rounded-0 bg-transparent" data-index="${index}" data-reveal="${REVEALS[position % REVEALS.length]}">
      <button class="photo-button" type="button" aria-label="${escapeHtml(TEXT.viewPhoto(captionOf(item)))}" data-index="${index}">
        <img class="card-img-top rounded-0" src="${escapeHtml(thumbSrc(item.src))}" alt="${escapeHtml(altOf(item))}"${ratioStyle(item)} loading="${position < 2 ? "eager" : "lazy"}" decoding="async">
        <span class="photo-overlay" aria-hidden="true">
          <span class="photo-overlay-caption">${escapeHtml(captionOf(item))}</span>
          <span class="photo-overlay-meta">${meta}</span>
          <span class="photo-hint"><i class="bi bi-zoom-in" aria-hidden="true"></i> ${escapeHtml(TEXT.hint)}</span>
        </span>
      </button>
      <div class="card-body px-0 pb-0 pt-3 d-sm-flex align-items-sm-baseline justify-content-sm-between gap-3 photo-caption">
        <p class="card-text mb-0">${escapeHtml(captionOf(item))}</p>
        <span class="photo-number d-block d-sm-inline mt-1 mt-sm-0">${padNumber((navPosition.get(index) ?? index) + 1)} / ${padNumber(navIndices.length || photos.length)}</span>
      </div>
    </article>
  `;
}

/** Pratinjau buram sebagai latar, lalu foto asli muncul perlahan begitu selesai dimuat. */
function setupImageLoading(cards: HTMLElement[]): void {
  cards.flatMap((card) => Array.from(card.querySelectorAll<HTMLButtonElement>(".photo-button"))).forEach((button) => {
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

/** Parallax tipis: kartu bergeser maksimum 12 px, arah berlawanan antar kartu bersebelahan. Mengembalikan fungsi untuk mendaftarkan kartu baru. */
function createParallax(): (cards: HTMLElement[]) => void {
  if (reduceMotion) return () => {};
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
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  return (cards) => cards.forEach((card) => observer.observe(card));
}

/** Animasi muncul saat kartu masuk layar. Mengembalikan fungsi untuk mendaftarkan kartu baru. */
function createReveal(): (cards: HTMLElement[]) => void {
  const observer = new IntersectionObserver((entries, self) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      self.unobserve(entry.target);
    });
  }, { threshold: 0.12 });
  // Jaring pengaman: jika observer tidak terpicu untuk sebuah kartu, kartu yang sudah masuk layar tetap ditampilkan.
  const revealInView = (): void => {
    gallery?.querySelectorAll<HTMLElement>(".gallery-card:not(.is-visible)").forEach((card) => {
      const rect = card.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) card.classList.add("is-visible");
    });
  };
  window.addEventListener("scroll", revealInView, { passive: true });
  window.addEventListener("resize", revealInView, { passive: true });
  return (cards) => {
    cards.forEach((card, index) => {
      card.style.transitionDelay = `${Math.min(index % 4, 3) * 70}ms`;
      observer.observe(card);
    });
    window.setTimeout(revealInView, 1200);
  };
}

// ---------- Urutan, filter, dan tampilan grid ----------

type Order = "default" | "newest" | "oldest" | "random";
const ORDERS: readonly string[] = ["default", "newest", "oldest", "random"];

/** Mengurutkan foto sesuai pengaturan admin. "default" = urutan dari server. Foto tanpa tanggal selalu di akhir. */
function sortPhotos(list: Photo[], order: Order): Photo[] {
  if (order === "random") {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
  if (order === "default") return list;
  const sign = order === "oldest" ? 1 : -1;
  return list
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

const filters = { location: "", year: "", album: "" };
let gridIndices: number[] = []; // foto yang tampil di grid (setelah filter)
let navIndices: number[] = []; // foto yang dilalui lightbox (setelah filter)
const navPosition = new Map<number, number>();

const isFiltering = (): boolean => filters.location !== "" || filters.year !== "" || filters.album !== "";
const yearOf = (item: Photo): string => /^(\d{4})/.exec(item.taken_at ?? "")?.[1] ?? "";

function matchesFilters(item: Photo): boolean {
  if (filters.location && locationOf(item).toLowerCase() !== filters.location) return false;
  if (filters.year && yearOf(item) !== filters.year) return false;
  if (filters.album && albumOf(item).toLowerCase() !== filters.album) return false;
  return true;
}

function computeView(): void {
  const matches = photos.flatMap((item, index) => (matchesFilters(item) ? [index] : []));
  navIndices = matches;
  // Tanpa filter, foto pertama sudah tampil di header sehingga grid dimulai dari foto kedua.
  gridIndices = isFiltering() || photos.length < 2 ? matches : matches.slice(1);
  navPosition.clear();
  navIndices.forEach((photoIndex, position) => navPosition.set(photoIndex, position));
}

function updateLoadMore(): void {
  if (!loadMoreWrap || !loadMoreButton) return;
  const hasMore = renderedUntil < gridIndices.length;
  loadMoreWrap.hidden = gridIndices.length <= pageSize;
  loadMoreButton.hidden = !hasMore;
  if (loadMoreStatus) {
    const featuredShown = !isFiltering() && photos.length > 1 ? 1 : 0;
    loadMoreStatus.textContent = TEXT.shown(renderedUntil + featuredShown, navIndices.length);
  }
}

/** Merender kartu berikutnya (satu halaman) ke grid. `focusFirst` memindahkan fokus ke kartu baru pertama. */
function renderNextPage(focusFirst: boolean): void {
  if (!gallery) return;
  const from = renderedUntil;
  const to = Math.min(from + pageSize, gridIndices.length);
  if (to <= from) return;
  const html = gridIndices.slice(from, to).map((photoIndex, offset) => renderCard(photos[photoIndex], photoIndex, from + offset)).join("");
  const template = document.createElement("template");
  template.innerHTML = html;
  const cards = Array.from(template.content.querySelectorAll<HTMLElement>(".gallery-card"));
  gallery.append(template.content);
  renderedUntil = to;
  setupImageLoading(cards);
  appendCards(cards);
  updateLoadMore();
  if (focusFirst) cards[0]?.querySelector<HTMLButtonElement>(".photo-button")?.focus();
}

/** Menyusun ulang grid dari awal (saat pertama tampil atau filter berubah). */
function applyView(): void {
  if (!gallery || !galleryCount) return;
  computeView();
  galleryCount.textContent = String(navIndices.length);
  gallery.innerHTML = "";
  renderedUntil = 0;
  if (gridIndices.length === 0) {
    gallery.innerHTML = `<p class="gallery-loading" role="status">${escapeHtml(TEXT.noMatch)}</p>`;
    updateLoadMore();
    return;
  }
  renderNextPage(false);
}

function fillSelect(select: HTMLSelectElement, options: { value: string; label: string }[]): void {
  select.textContent = "";
  [{ value: "", label: TEXT.all }, ...options].forEach((option) => {
    const element = document.createElement("option");
    element.value = option.value;
    element.textContent = option.label;
    select.append(element);
  });
}

/** Filter lokasi dan tahun dibuat dari data foto; kolom yang hanya punya satu pilihan disembunyikan. */
function setupFilters(): void {
  if (!filtersBox || !filterLocation || !filterYear) return;
  const locations = new Map<string, string>();
  const years = new Set<string>();
  photos.forEach((item) => {
    const place = locationOf(item);
    if (place && !locations.has(place.toLowerCase())) locations.set(place.toLowerCase(), place);
    const year = yearOf(item);
    if (year) years.add(year);
  });
  fillSelect(filterLocation, [...locations].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label)));
  fillSelect(filterYear, [...years].sort().reverse().map((year) => ({ value: year, label: year })));
  const showLocation = locations.size >= 2;
  const showYear = years.size >= 2;
  const locationField = filterLocation.closest<HTMLElement>(".filter");
  const yearField = filterYear.closest<HTMLElement>(".filter");
  if (locationField) locationField.hidden = !showLocation;
  if (yearField) yearField.hidden = !showYear;
  filtersBox.hidden = !showLocation && !showYear;

  const changed = (): void => {
    filters.location = filterLocation.value;
    filters.year = filterYear.value;
    if (filterReset) filterReset.hidden = !isFiltering();
    applyView();
  };
  filterLocation.addEventListener("change", changed);
  filterYear.addEventListener("change", changed);
  filterReset?.addEventListener("click", () => {
    filterLocation.value = "";
    filterYear.value = "";
    filters.album = "";
    syncAlbumTabs();
    syncAlbumUrl();
    changed();
  });
}

/** Menyimpan album yang dipilih di alamat (?album=), agar tombol kembali dari halaman foto membuka album yang sama. */
function syncAlbumUrl(): void {
  try {
    const params = new URLSearchParams(location.search);
    const button = albumTabs?.querySelector<HTMLButtonElement>(`button[data-album="${CSS.escape(filters.album)}"]`);
    if (filters.album && button) params.set("album", button.textContent ?? filters.album); else params.delete("album");
    const query = params.toString();
    history.replaceState(null, "", `${location.pathname}${query ? `?${query}` : ""}${location.hash}`);
  } catch {
    // Abaikan: alamat hanyalah kemudahan tambahan.
  }
}

function syncAlbumTabs(): void {
  albumTabs?.querySelectorAll<HTMLButtonElement>("button").forEach((button) => {
    button.setAttribute("aria-pressed", String((button.dataset.album ?? "") === filters.album));
  });
}

/** Tab album di atas galeri; hanya muncul jika ada foto yang punya album. */
function setupAlbums(): void {
  if (!albumTabs) return;
  const albums = new Map<string, string>();
  photos.forEach((item) => {
    const name = albumOf(item);
    if (name && !albums.has(name.toLowerCase())) albums.set(name.toLowerCase(), name);
  });
  if (albums.size === 0) {
    albumTabs.hidden = true;
    return;
  }
  const entries: [string, string][] = [["", TEXT.all], ...[...albums].sort((a, b) => a[1].localeCompare(b[1]))];
  albumTabs.textContent = "";
  entries.forEach(([value, label]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "album-tab";
    button.dataset.album = value;
    button.textContent = label;
    albumTabs.append(button);
  });
  albumTabs.hidden = false;
  albumTabs.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-album]");
    if (!button) return;
    filters.album = button.dataset.album ?? "";
    syncAlbumTabs();
    if (filterReset) filterReset.hidden = !isFiltering();
    syncAlbumUrl();
    applyView();
  });
  // Tautan dari halaman foto (?album=Nama) langsung membuka album tersebut.
  const wanted = new URLSearchParams(location.search).get("album")?.trim().toLowerCase() ?? "";
  if (wanted && albums.has(wanted)) {
    filters.album = wanted;
    if (filterReset) filterReset.hidden = false;
  }
  syncAlbumTabs();
}

function renderGallery(): void {
  if (!gallery || !galleryCount) return;
  if (loading) loading.remove();
  if (photos.length > 0) renderFeatured(photos[0]);
  const observeReveal = createReveal();
  const observeParallax = createParallax();
  appendCards = (cards) => {
    observeReveal(cards);
    observeParallax(cards);
  };
  setupAlbums();
  setupFilters();
  applyView();
  if (slideshowStart) slideshowStart.hidden = photos.length < 2 || typeof bootstrap === "undefined";
}

// ---------- Lightbox (Bootstrap Modal) ----------

function getModal(): BsModal | null {
  return lightbox && typeof bootstrap !== "undefined" ? bootstrap.Modal.getOrCreateInstance(lightbox) : null;
}

/** Memuat foto sebelum dan sesudah foto aktif agar perpindahan terasa instan. */
/** Foto di sebelah `index`: mengikuti hasil filter jika foto itu termasuk di dalamnya, selain itu daftar lengkap. */
function neighborOf(index: number, step: number): number {
  const position = navPosition.get(index);
  if (position !== undefined && navIndices.length > 0) return navIndices[(position + step + navIndices.length) % navIndices.length];
  return (index + step + photos.length) % photos.length;
}

function preloadNeighbors(index: number): void {
  if (photos.length < 2) return;
  [neighborOf(index, 1), neighborOf(index, -1)].forEach((i) => {
    const src = photos[i].src;
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

const EXCERPT_LENGTH = 110;

/** Potongan awal cerita (di batas kata). `truncated` true jika ada yang dipotong. */
function excerptOf(story: string): { text: string; truncated: boolean } {
  if (story.length <= EXCERPT_LENGTH) return { text: story, truncated: false };
  const cut = story.slice(0, EXCERPT_LENGTH);
  const space = cut.lastIndexOf(" ");
  return { text: `${(space > 40 ? cut.slice(0, space) : cut).replace(/[\s,.;:!?-]+$/, "")}…`, truncated: true };
}

function setStory(item: Photo): void {
  const story = storyOf(item);
  const { text, truncated } = excerptOf(story);
  if (lightboxStory && lightboxStoryText) {
    lightboxStory.hidden = !story;
    lightboxStoryText.textContent = text;
  }
  if (lightboxReadMore) {
    // "Baca selengkapnya" hanya muncul jika cerita terpotong dan foto punya halaman sendiri.
    lightboxReadMore.hidden = !(truncated && item.id);
    if (item.id) lightboxReadMore.href = photoUrl(item.id);
  }
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
  resetZoom();
  lightboxImage.src = item.src;
  lightboxImage.alt = altOf(item);
  lightboxCaption.textContent = captionOf(item);
  const position = navPosition.get(activeIndex);
  lightboxCount.textContent = position !== undefined
    ? `${padNumber(position + 1)} / ${padNumber(navIndices.length)}`
    : `${padNumber(activeIndex + 1)} / ${padNumber(photos.length)}`;
  if (item.id) setPhotoHash(item.id);
  setMeta(item);
  setStory(item);
  if (lightboxLink) {
    // Tautan umum disembunyikan bila "Baca selengkapnya" sudah menuju halaman yang sama.
    lightboxLink.hidden = !item.id || (!!lightboxReadMore && !lightboxReadMore.hidden);
    if (item.id) lightboxLink.href = photoUrl(item.id);
  }
  if (lightboxShare) lightboxShare.hidden = !item.id;
  // Tombol kembali menyebut album yang sedang dibuka (tab album aktif); tanpa album = galeri.
  if (lightboxBackText) {
    const tab = filters.album ? albumTabs?.querySelector<HTMLButtonElement>(`button[data-album="${CSS.escape(filters.album)}"]`) : null;
    lightboxBackText.textContent = tab?.textContent ? TEXT.backToAlbum(tab.textContent) : TEXT.backToGallery;
  }
  const single = photos.length < 2;
  if (lightboxEdgePrevious) lightboxEdgePrevious.hidden = single;
  if (lightboxEdgeNext) lightboxEdgeNext.hidden = single;
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
  showLightbox(neighborOf(activeIndex, step));
}

// ---------- Tautan langsung ke foto (#foto-12 / #photo-12) ----------

const HASH_PATTERN = /^#(?:foto|photo)-(\d+)$/;

function setPhotoHash(id: number): void {
  try {
    history.replaceState(null, "", `#${lang === "en" ? "photo" : "foto"}-${id}`);
  } catch {
    // Abaikan: tautan langsung hanyalah kemudahan tambahan.
  }
}

function clearPhotoHash(): void {
  if (!HASH_PATTERN.test(location.hash)) return;
  try {
    history.replaceState(null, "", `${location.pathname}${location.search}`);
  } catch {
    // Abaikan.
  }
}

/** Indeks foto dari hash di alamat, atau -1 jika tidak ada atau tidak ditemukan. */
function indexFromHash(): number {
  const match = HASH_PATTERN.exec(location.hash);
  return match ? photos.findIndex((item) => item.id === Number(match[1])) : -1;
}

function openFromHash(): void {
  const index = indexFromHash();
  if (index >= 0) showLightbox(index);
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

// ---------- Zoom di lightbox ----------
// Ketuk dua kali, roda mouse / cubit di trackpad, cubit dua jari, atau tombol + - 0. Geser untuk melihat bagian lain.
// Memakai properti `scale` dan `translate` (bukan `transform`) agar tidak bentrok dengan animasi masuk foto.

const MAX_ZOOM = 5;
const DOUBLE_TAP_ZOOM = 2.5;
const zoom = { scale: 1, x: 0, y: 0 };
const pointers = new Map<number, { x: number; y: number }>();
let pinchDistance = 0;
let dragMoved = false;
let tapStart: { time: number; x: number; y: number } | null = null;
let lastTap: { time: number; x: number; y: number } | null = null;

function applyZoom(): void {
  if (!lightboxImage) return;
  const zoomed = zoom.scale > 1;
  lightboxImage.style.setProperty("scale", zoomed ? String(zoom.scale) : "");
  lightboxImage.style.setProperty("translate", zoomed ? `${zoom.x}px ${zoom.y}px` : "");
  lightboxBackdrop?.classList.toggle("is-zoomed", zoomed);
}

function resetZoom(): void {
  zoom.scale = 1;
  zoom.x = 0;
  zoom.y = 0;
  pointers.clear();
  pinchDistance = 0;
  tapStart = null;
  applyZoom();
}

/** Menjaga foto tidak bisa digeser keluar dari bingkai. */
function clampZoom(): void {
  if (!lightboxImage || !lightboxBackdrop) return;
  const maxX = Math.max(0, (lightboxImage.offsetWidth * zoom.scale - lightboxBackdrop.clientWidth) / 2);
  const maxY = Math.max(0, (lightboxImage.offsetHeight * zoom.scale - lightboxBackdrop.clientHeight) / 2);
  zoom.x = Math.max(-maxX, Math.min(maxX, zoom.x));
  zoom.y = Math.max(-maxY, Math.min(maxY, zoom.y));
}

/** Mengubah skala dengan titik (clientX, clientY) tetap berada di bawah jari / kursor. */
function zoomAt(nextScale: number, clientX: number, clientY: number): void {
  if (!lightboxBackdrop) return;
  const scale = Math.max(1, Math.min(MAX_ZOOM, nextScale));
  if (scale <= 1.001) {
    zoom.scale = 1;
    zoom.x = 0;
    zoom.y = 0;
    applyZoom();
    return;
  }
  const rect = lightboxBackdrop.getBoundingClientRect();
  const px = clientX - (rect.left + rect.width / 2);
  const py = clientY - (rect.top + rect.height / 2);
  const ratio = scale / zoom.scale;
  zoom.x = px - (px - zoom.x) * ratio;
  zoom.y = py - (py - zoom.y) * ratio;
  zoom.scale = scale;
  clampZoom();
  applyZoom();
}

function zoomFromCenter(factor: number): void {
  if (!lightboxBackdrop) return;
  const rect = lightboxBackdrop.getBoundingClientRect();
  zoomAt(zoom.scale * factor, rect.left + rect.width / 2, rect.top + rect.height / 2);
}

const pinchPoints = (): [{ x: number; y: number }, { x: number; y: number }] => {
  const [first, second] = [...pointers.values()];
  return [first, second];
};
const pinchSpan = (): number => {
  const [a, b] = pinchPoints();
  return Math.hypot(a.x - b.x, a.y - b.y);
};
const pinchCenter = (): { x: number; y: number } => {
  const [a, b] = pinchPoints();
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
};

if (lightboxImage) lightboxImage.draggable = false;

lightboxBackdrop?.addEventListener("pointerdown", (event) => {
  if (event.pointerType === "mouse" && event.button !== 0) return;
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (pointers.size === 1) {
    dragMoved = false;
    tapStart = { time: performance.now(), x: event.clientX, y: event.clientY };
  } else if (pointers.size === 2) {
    pinchDistance = pinchSpan();
    tapStart = null;
    dragMoved = true;
  }
});

lightboxBackdrop?.addEventListener("pointermove", (event) => {
  const previous = pointers.get(event.pointerId);
  if (!previous) return;
  const current = { x: event.clientX, y: event.clientY };
  // Pointer capture hanya dipakai saat menggeser atau mencubit. Jika dipakai sejak ketukan, browser mengarahkan
  // "click" ke bingkai dan satu ketukan di foto akan menutup lightbox.
  const target = event.currentTarget as HTMLElement;
  if ((zoom.scale > 1 || pointers.size === 2) && !target.hasPointerCapture(event.pointerId)) target.setPointerCapture(event.pointerId);
  if (pointers.size === 2) {
    const before = pinchCenter();
    pointers.set(event.pointerId, current);
    const after = pinchCenter();
    const span = pinchSpan();
    if (zoom.scale > 1) {
      zoom.x += after.x - before.x;
      zoom.y += after.y - before.y;
    }
    if (pinchDistance > 0) zoomAt(zoom.scale * (span / pinchDistance), after.x, after.y);
    pinchDistance = span;
    return;
  }
  pointers.set(event.pointerId, current);
  if (tapStart && Math.hypot(current.x - tapStart.x, current.y - tapStart.y) > 6) dragMoved = true;
  if (zoom.scale > 1) {
    zoom.x += current.x - previous.x;
    zoom.y += current.y - previous.y;
    clampZoom();
    applyZoom();
  }
});

function endPointer(event: PointerEvent): void {
  if (!pointers.delete(event.pointerId)) return;
  pinchDistance = 0;
  if (pointers.size > 0) return;
  const start = tapStart;
  tapStart = null;
  if (event.type !== "pointerup" || !start || dragMoved) return;
  const now = performance.now();
  if (now - start.time > 300) return;
  if (lastTap && now - lastTap.time < 350 && Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) < 30) {
    lastTap = null;
    zoomAt(zoom.scale > 1 ? 1 : DOUBLE_TAP_ZOOM, event.clientX, event.clientY);
  } else {
    lastTap = { time: now, x: event.clientX, y: event.clientY };
  }
}
lightboxBackdrop?.addEventListener("pointerup", endPointer);
lightboxBackdrop?.addEventListener("pointercancel", endPointer);

// Klik setelah menggeser foto tidak boleh menutup lightbox.
lightboxBackdrop?.addEventListener("click", (event) => {
  if (dragMoved) event.stopPropagation();
}, true);

lightboxBackdrop?.addEventListener("wheel", (event) => {
  event.preventDefault();
  zoomAt(zoom.scale * Math.exp(-event.deltaY * 0.0015), event.clientX, event.clientY);
}, { passive: false });

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
  if (zoom.scale > 1) return; // saat diperbesar, geser dipakai untuk menggeser foto
  if (Math.abs(dx) >= SWIPE_DISTANCE && Math.abs(dx) > Math.abs(dy) * 1.5) moveLightbox(dx < 0 ? 1 : -1);
}, { passive: true });

lightboxBackdrop?.addEventListener("touchcancel", () => { touchStart = null; }, { passive: true });

// ---------- Memuat data ----------

async function loadDevPhotos(): Promise<Photo[]> {
  const { fallbackPhotos } = await import("./dev-photos.js");
  return fallbackPhotos;
}

/** Pengaturan dari admin (jumlah foto per halaman dan urutan); jika gagal dimuat, pakai nilai bawaan. */
async function loadSettings(): Promise<{ pageSize: number; order: Order }> {
  const fallback = { pageSize: DEFAULT_PAGE_SIZE, order: "default" as Order };
  try {
    const response = await fetch("/api/settings", { headers: { Accept: "application/json" } });
    if (!response.ok) return fallback;
    const data = await response.json() as { gallery_page_size?: unknown; gallery_order?: unknown };
    const size = Math.floor(Number(data.gallery_page_size));
    const order = typeof data.gallery_order === "string" && ORDERS.includes(data.gallery_order) ? data.gallery_order as Order : "default";
    return { pageSize: Number.isFinite(size) && size >= MIN_PAGE_SIZE ? Math.min(size, MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE, order };
  } catch {
    return fallback;
  }
}

type AlbumMap = Record<string, { album?: string; album_en?: string | null }>;

/** Album per foto (id foto -> nama album). Gagal dimuat = galeri tampil tanpa tab album. */
async function loadAlbums(): Promise<AlbumMap> {
  try {
    const response = await fetch("/api/albums", { headers: { Accept: "application/json" } });
    if (!response.ok) return {};
    const data: unknown = await response.json();
    return data && typeof data === "object" ? data as AlbumMap : {};
  } catch {
    return {};
  }
}

async function loadPhotos(): Promise<void> {
  const [settings, albums] = await Promise.all([loadSettings(), loadAlbums()]);
  pageSize = settings.pageSize;
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
  photos.forEach((item) => {
    const entry = item.id === undefined ? undefined : albums[String(item.id)];
    if (entry?.album) {
      item.album = entry.album;
      item.album_en = entry.album_en ?? null;
    }
  });
  photos = sortPhotos(photos, settings.order);
  renderGallery();
  openFromHash();
}

featured?.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>(".featured-button");
  if (button) showLightbox(0, button);
});
gallery?.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>(".photo-button");
  if (button) showLightbox(Number(button.dataset.index), button);
});
loadMoreButton?.addEventListener("click", () => renderNextPage(true));
slideshowStart?.addEventListener("click", () => {
  showLightbox(navIndices[0] ?? 0, slideshowStart);
  startSlideshow();
});
lightboxPrevious?.addEventListener("click", () => moveLightbox(-1));
lightboxNext?.addEventListener("click", () => moveLightbox(1));
lightboxEdgePrevious?.addEventListener("click", () => moveLightbox(-1));
lightboxEdgeNext?.addEventListener("click", () => moveLightbox(1));
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
  resetZoom();
  clearPhotoHash();
  if (lightboxImage) lightboxImage.src = "";
  restoreFocus();
});
document.addEventListener("keydown", (event) => {
  if (!lightboxOpen) return;
  if (event.key === "ArrowLeft") moveLightbox(-1);
  if (event.key === "ArrowRight") moveLightbox(1);
  if (event.key === "+" || event.key === "=") zoomFromCenter(1.4);
  if (event.key === "-") zoomFromCenter(1 / 1.4);
  if (event.key === "0") resetZoom();
});
window.addEventListener("hashchange", () => {
  const index = indexFromHash();
  if (index >= 0) {
    if (!lightboxOpen || activeIndex !== index) showLightbox(index);
  } else if (lightboxOpen && !HASH_PATTERN.test(location.hash)) {
    closeLightbox();
  }
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
