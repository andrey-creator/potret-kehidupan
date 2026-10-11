import type { Photo } from "./types.js";

const isLocalPreview = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);

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
const lightboxClose = document.querySelector<HTMLButtonElement>("#lightboxClose");
const lightboxPrevious = document.querySelector<HTMLButtonElement>("#lightboxPrevious");
const lightboxNext = document.querySelector<HTMLButtonElement>("#lightboxNext");
const lightboxBackdrop = document.querySelector<HTMLElement>("#lightboxBackdrop");
let photos: Photo[] = [];
let activeIndex = 0;

const padNumber = (number: number): string => String(number).padStart(2, "0");

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

function formatDate(iso: string | null | undefined): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  const month = match ? MONTHS[Number(match[2]) - 1] : undefined;
  return match && month ? `${Number(match[3])} ${month} ${match[1]}` : "";
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
    <button class="featured-button" type="button" aria-label="Lihat foto unggulan: ${escapeHtml(item.caption)}" data-index="0">
      <img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.alt)}"${sizeAttributes} fetchpriority="high" decoding="async">
    </button>
    <figcaption class="featured-caption">
      <p>${escapeHtml(item.caption)}</p>
      <span>Pilihan</span>
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
    <article class="gallery-card is-${item.size}" data-index="${index}">
      <button class="photo-button" type="button" aria-label="Lihat foto: ${escapeHtml(item.caption)}" data-index="${index}">
        <img src="${escapeHtml(thumbSrc(item.src))}" alt="${escapeHtml(item.alt)}"${ratioStyle(item)} loading="${index < 2 ? "eager" : "lazy"}" decoding="async">
        <span class="photo-hint">Klik untuk melihat</span>
      </button>
      <div class="photo-caption">
        <p>${escapeHtml(item.caption)}</p>
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

function showLightbox(index: number): void {
  if (!lightbox || !lightboxImage || !lightboxCaption || !lightboxCount || !lightboxClose || photos.length === 0) return;
  activeIndex = (index + photos.length) % photos.length;
  const item = photos[activeIndex];
  lightboxImage.src = item.src;
  lightboxImage.alt = item.alt;
  lightboxCaption.textContent = item.caption;
  lightboxCount.textContent = `${padNumber(activeIndex + 1)} / ${padNumber(photos.length)}`;
  if (lightboxMeta) {
    lightboxMeta.textContent = [formatDate(item.taken_at), item.location?.trim() ?? ""].filter(Boolean).join(" · ");
    lightboxMeta.hidden = !lightboxMeta.textContent;
  }
  if (lightboxLink) {
    lightboxLink.hidden = !item.id;
    if (item.id) lightboxLink.href = `/foto/${item.id}`;
  }
  lightbox.hidden = false;
  document.body.classList.add("is-locked");
  lightboxClose.focus();
}

function closeLightbox(): void {
  if (!lightbox || !lightboxImage) return;
  lightbox.hidden = true;
  lightboxImage.src = "";
  document.body.classList.remove("is-locked");
}

function moveLightbox(step: number): void { showLightbox(activeIndex + step); }

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
      renderMessage("Galeri belum bisa dimuat. Muat ulang halaman beberapa saat lagi.", "—");
      return;
    }
  }
  if (photos.length === 0) {
    if (isLocalPreview) {
      photos = await loadDevPhotos();
    } else {
      renderMessage("Belum ada momen yang ditampilkan.", "0");
      return;
    }
  }
  renderGallery();
}

featured?.addEventListener("click", (event) => {
  if ((event.target as HTMLElement).closest(".featured-button")) showLightbox(0);
});
gallery?.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>(".photo-button");
  if (button) showLightbox(Number(button.dataset.index));
});
lightboxClose?.addEventListener("click", closeLightbox);
lightboxPrevious?.addEventListener("click", () => moveLightbox(-1));
lightboxNext?.addEventListener("click", () => moveLightbox(1));
lightbox?.addEventListener("click", (event) => {
  if (event.target === lightbox || event.target === lightboxBackdrop) closeLightbox();
});
document.addEventListener("keydown", (event) => {
  if (lightbox?.hidden) return;
  if (event.key === "Escape") closeLightbox();
  if (event.key === "ArrowLeft") moveLightbox(-1);
  if (event.key === "ArrowRight") moveLightbox(1);
});

const year = String(new Date().getFullYear());
const currentYear = document.querySelector<HTMLElement>("#currentYear");
const footerYear = document.querySelector<HTMLElement>("#footerYear");
if (currentYear) currentYear.textContent = year;
if (footerYear) footerYear.textContent = year;
void loadPhotos();
