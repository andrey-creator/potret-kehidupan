type PhotoSize = "regular" | "wide" | "tall";

type Photo = {
  id?: number;
  src: string;
  alt: string;
  caption: string;
  size: PhotoSize;
  sort_order?: number;
  width?: number | null;
  height?: number | null;
};

const fallbackPhotos: Photo[] = [
  { src: "https://picsum.photos/seed/potret-01/1400/1750", alt: "Cahaya pagi di balik jendela", caption: "Pagi datang perlahan.", size: "tall" },
  { src: "https://picsum.photos/seed/potret-02/1600/1000", alt: "Jalan panjang dengan bayangan pepohonan", caption: "Jalan yang pernah kita pilih.", size: "wide" },
  { src: "https://picsum.photos/seed/potret-03/1200/1600", alt: "Kursi kosong di ruang yang tenang", caption: "Tempat sunyi menyimpan cerita.", size: "regular" },
  { src: "https://picsum.photos/seed/potret-04/1200/1600", alt: "Tangan memegang bunga kecil", caption: "Hal kecil, rasa yang besar.", size: "regular" },
  { src: "https://picsum.photos/seed/potret-05/1600/1000", alt: "Langit sore berwarna lembut", caption: "Sore yang masih tinggal.", size: "wide" },
  { src: "https://picsum.photos/seed/potret-06/1200/1600", alt: "Bangku taman di bawah cahaya", caption: "Berhenti sebentar di sini.", size: "tall" },
  { src: "https://picsum.photos/seed/potret-07/1200/1600", alt: "Detail arsitektur dan cahaya", caption: "Cahaya menemukan jalannya.", size: "regular" },
  { src: "https://picsum.photos/seed/potret-08/1600/1000", alt: "Pemandangan laut dari kejauhan", caption: "Jauh, namun terasa dekat.", size: "wide" },
  { src: "https://picsum.photos/seed/potret-09/1200/1600", alt: "Buku terbuka di atas meja", caption: "Halaman yang belum selesai.", size: "regular" },
  { src: "https://picsum.photos/seed/potret-10/1200/1600", alt: "Siluet seseorang di senja hari", caption: "Kita tumbuh dari perjalanan.", size: "tall" },
  { src: "https://picsum.photos/seed/potret-11/1600/1000", alt: "Pemandangan kota dari atas", caption: "Ramai yang tetap terasa hening.", size: "wide" },
  { src: "https://picsum.photos/seed/potret-12/1200/1600", alt: "Daun hijau terkena embun", caption: "Pagi meninggalkan jejak.", size: "regular" },
  { src: "https://picsum.photos/seed/potret-13/1200/1600", alt: "Jendela dengan tirai putih", caption: "Rumah adalah suara-suara kecil.", size: "regular" },
  { src: "https://picsum.photos/seed/potret-14/1600/1000", alt: "Awan tipis di atas bukit", caption: "Langit selalu punya ruang.", size: "wide" },
  { src: "https://picsum.photos/seed/potret-15/1200/1600", alt: "Sepeda bersandar di dinding", caption: "Pulang lewat jalan berbeda.", size: "tall" },
  { src: "https://picsum.photos/seed/potret-16/1200/1600", alt: "Cangkir di dekat cahaya pagi", caption: "Hari ini cukup untuk dikenang.", size: "regular" }
];

const gallery = document.querySelector<HTMLElement>("#gallery");
const loading = document.querySelector<HTMLElement>("#galleryLoading");
const galleryCount = document.querySelector<HTMLElement>("#galleryCount");
const lightbox = document.querySelector<HTMLElement>("#lightbox");
const lightboxImage = document.querySelector<HTMLImageElement>("#lightboxImage");
const lightboxCaption = document.querySelector<HTMLElement>("#lightboxCaption");
const lightboxCount = document.querySelector<HTMLElement>("#lightboxCount");
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

function ratioStyle(item: Photo): string {
  const width = Number(item.width);
  const height = Number(item.height);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) return "";
  return ` width="${width}" height="${height}" style="aspect-ratio: ${width} / ${height}"`;
}

function renderGallery(): void {
  if (!gallery || !galleryCount) return;
  galleryCount.textContent = String(photos.length);
  if (loading) loading.remove();
  gallery.innerHTML = photos.map((item, index) => `
    <article class="gallery-card is-${item.size}" data-index="${index}">
      <button class="photo-button" type="button" aria-label="Lihat foto: ${escapeHtml(item.caption)}" data-index="${index}">
        <img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.alt)}"${ratioStyle(item)} loading="${index < 2 ? "eager" : "lazy"}" decoding="async">
        <span class="photo-hint">Klik untuk melihat</span>
      </button>
      <div class="photo-caption">
        <p>${escapeHtml(item.caption)}</p>
        <span class="photo-number">${padNumber(index + 1)} / ${padNumber(photos.length)}</span>
      </div>
    </article>
  `).join("");

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

async function loadPhotos(): Promise<void> {
  try {
    const response = await fetch("/api/photos", { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`API ${response.status}`);
    const remotePhotos = await response.json() as Photo[];
    photos = remotePhotos.length > 0 ? remotePhotos : fallbackPhotos;
  } catch (error) {
    console.info("API galeri belum terhubung; memakai placeholder lokal.", error);
    photos = fallbackPhotos;
  }
  renderGallery();
}

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
