# Potret Kehidupan

Website galeri foto personal di Cloudflare Pages. Frontend statis (HTML + CSS + TypeScript), API JSON lewat Pages Functions, dan database D1. File foto juga disimpan di D1 (base64), jadi **tidak butuh R2**.

## Teknologi

- **Frontend:** HTML, CSS custom, dan TypeScript (dikompilasi ke `dist/assets/app.js`). Dua bahasa: Indonesia (`/`) dan Inggris (`/en/`).
- **Bootstrap 5.3.3 + Bootstrap Icons 1.11.3:** dipasang lewat npm dan disalin ke `dist/assets/vendor/` saat build (tanpa CDN). Dipakai di halaman admin dan halaman publik: navbar yang menempel, kartu galeri, lightbox (Modal), toast, tombol, ikon, dan utility classes. `src/styles.css` menata ulang Bootstrap lewat variabel CSS (warna, font, sudut tajam) agar tetap sesuai karakter situs.
- **API:** Cloudflare Pages Functions (`functions/`).
- **Database + foto:** Cloudflare D1 (tabel `photos` dan `photo_files`).
- **Source control:** GitHub. Cloudflare Pages membangun otomatis setiap push ke `main`.

## Struktur penting

```text
public/index.html            # halaman publik (Indonesia) — DIHASILKAN oleh scripts/generate-pages.mjs
public/en/index.html         # halaman publik (Inggris) — dihasilkan oleh skrip yang sama
scripts/generate-pages.mjs   # templat tunggal kedua halaman publik; jalankan: npm run generate:pages
public/admin.html            # halaman admin (/admin)
public/404.html              # halaman 404
public/_headers              # header keamanan untuk file statis
src/app.ts                   # render galeri, foto unggulan, lightbox
src/dev-photos.ts            # placeholder, HANYA dimuat di localhost
src/styles.css               # gaya
functions/index.ts           # menyisipkan og:image dan canonical ke halaman utama
functions/_lib/auth.ts       # cek token admin (constant-time) dan helper JSON
functions/api/photos.ts      # GET foto publik
functions/api/photos/[id].ts # GET satu foto published
functions/api/img/[id].ts    # menyajikan file foto dari D1 (?s=thumb untuk versi kecil)
functions/foto/[id].ts       # halaman tiap foto (/foto/:id), dirender di server
functions/en/                # versi Inggris: /en/ (og + hreflang) dan /en/photo/:id
functions/_lib/              # auth, images, photos (kueri bertingkat), i18n, home, photo-page
functions/sitemap.xml.ts     # /sitemap.xml
functions/robots.txt.ts      # /robots.txt
functions/api/admin/*        # semua endpoint tulis (token admin)
migrations/                  # 0001 tabel photos, 0002 photo_files, 0003 width/height, 0004 thumbnail + tanggal/lokasi/cerita, 0005 teks bahasa Inggris, 0006 pratinjau buram
scripts/                     # build.mjs dan prune-dev.mjs
wrangler.toml                # binding D1
```

## Setup Cloudflare (sekali saja)

1. Buat database D1 `potret-kehidupan`, salin `database_id` ke `wrangler.toml`.
2. Jalankan isi `migrations/0001_create_photos.sql`, `0002_photo_files.sql`, `0003_photo_dimensions.sql`, `0004_thumbs_and_story.sql`, `0005_english_version.sql`, dan `0006_blur_placeholder.sql` secara berurutan (satu pernyataan per eksekusi jika memakai Console) (lewat Console D1 di dashboard atau `wrangler d1 migrations apply potret-kehidupan --remote`).
3. Buat project **Pages** (bukan Workers) dari repository GitHub: production branch `main`, build command `npm ci && npm run build`, output `dist`.
4. Tambahkan secret `ADMIN_TOKEN` di Settings project. Buat dengan:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Jangan memasukkan nilai token ke GitHub atau membagikannya.
5. Retry deployment agar secret aktif.
6. Buka `/admin`, masuk dengan token, lalu **hapus foto placeholder** bawaan migrasi 0001.

Update berikutnya cukup `git add .`, `git commit`, `git push`.

## Memakai halaman admin

- `/admin` untuk upload (banyak foto sekaligus), edit caption/alt/ukuran, **ganti file foto**, **atur urutan** (← Maju / Mundur →), **sembunyikan/tampilkan** foto, hapus, dan memilih foto unggulan.
- Foto dikecilkan otomatis di browser (sisi terpanjang 1600 px, sekitar 200–500 KB).
- Foto pertama (urutan terkecil, ditandai ★) tampil di header dan menjadi `og:image` untuk pratinjau link.
- Batas satu foto sekitar 1,3 MB setelah dikecilkan (batas baris D1 2 MB).
- Upload dan ganti file otomatis membuat **thumbnail** 800 px untuk grid galeri. Foto baru juga otomatis dibuatkan **pratinjau buram** (gambar mungil yang tampil sebelum foto selesai dimuat). Untuk foto lama, klik **Siapkan foto lama** (membuat thumbnail dan pratinjau buram yang belum ada).
- **Edit** juga mengisi tanggal, lokasi, dan cerita singkat. Foto yang punya data itu menampilkannya di lightbox dan di halaman `/foto/:id`.
- **Edit → tab English**: caption, deskripsi (alt), lokasi, dan cerita versi Inggris. Semua opsional; yang kosong memakai teks Indonesia di `/en/`.
- **Unduh cadangan (.zip)** berisi `photos.json` (semua metadata, termasuk foto tersembunyi dan cerita) dan semua file foto. Pemulihan belum otomatis: foto bisa diunggah ulang dari zip. Cadangan database penuh: `npx wrangler d1 export potret-kehidupan --remote --output cadangan.sql`.

## Endpoint API

Publik:

```text
GET /api/photos          # foto yang published
GET /api/photos/:id      # satu foto published
GET /api/img/:id         # file foto dari D1 (tambahkan ?s=thumb untuk versi kecil)
GET /foto/:id            # halaman foto (HTML, Indonesia)
GET /en/, /en/photo/:id  # versi Inggris
GET /sitemap.xml, /robots.txt
```

Admin (semua butuh header `Authorization: Bearer <ADMIN_TOKEN>`):

```text
POST   /api/admin/auth-check
POST   /api/admin/photo-upload   # multipart: file, caption, alt, size, width, height, thumb, blur
GET    /api/admin/photos         # daftar lengkap, termasuk foto tersembunyi
POST   /api/admin/photos         # tambah metadata (src sudah ada)
PUT    /api/admin/photos/:id     # ubah metadata / status terbit (+ taken_at, location, story)
POST   /api/admin/photos/:id/image  # ganti file foto (multipart: file, width, height, thumb, blur)
POST   /api/admin/photos/:id/thumb  # simpan thumbnail untuk foto yang sudah ada (multipart: thumb)
POST   /api/admin/photos/:id/blur   # simpan pratinjau buram (JSON: { "blur": "data:image/jpeg;base64,..." })
POST   /api/admin/reorder        # simpan urutan: { "ids": [semua id foto, berurutan] }
DELETE /api/admin/photos/:id     # hapus foto (dan filenya)
```

## Pengembangan lokal

```bash
npm install
npm run typecheck
npm run build
```

Pratinjau dengan Functions dan D1 lokal:

```bash
cp .dev.vars.example .dev.vars        # isi ADMIN_TOKEN lokal
npx wrangler d1 migrations apply potret-kehidupan --local
npm run dev                            # http://127.0.0.1:8788
```

Catatan Windows: jalankan di Git Bash. Port 8788 dipilih karena port 3000 sering diblokir Windows.

Di `localhost`, jika API belum siap, galeri memakai foto placeholder dari `src/dev-photos.ts`. File itu dibuang dari build Cloudflare (`CF_PAGES=1`), jadi di produksi pengunjung tidak pernah melihat foto palsu.

## Keamanan

- Semua endpoint tulis ada di `/api/admin/*` dan meminta `ADMIN_TOKEN` (dibandingkan constant-time).
- SVG ditolak saat upload.
- `public/_headers` memasang header dasar untuk file statis; `/admin` ditandai noindex dan tidak di-cache.
- Opsional: lindungi `/admin`, `/admin.html`, dan `/api/admin/*` dengan Cloudflare Access (Zero Trust → Access → Self-hosted). Aturan per path umumnya butuh custom domain; di `*.pages.dev` mungkin tidak berfungsi. `ADMIN_TOKEN` tetap menjadi lapis pengaman utama.

## Lightbox dan berbagi

- Geser kiri/kanan di layar sentuh untuk pindah foto; panah kiri/kanan dan Esc di keyboard.
- Foto sebelum dan sesudahnya dimuat lebih dulu agar perpindahan terasa instan.
- Saat ditutup, fokus kembali ke foto yang sedang dilihat. Tab berputar di dalam lightbox.
- Tombol **Bagikan** memakai Web Share API di HP, atau menyalin tautan halaman foto di komputer.
- Animasi dikurangi untuk pengguna dengan pengaturan `prefers-reduced-motion`.

## Bahasa

- `/` Indonesia dan `/en/` Inggris, saling menaut lewat tombol ID | EN dan tag `hreflang`.
- Teks tetap di halaman: `public/index.html` dan `public/en/index.html` (termasuk teks pengantar).
- Teks tiap foto: lewat tab English di Edit (migrasi 0005).
- `/sitemap.xml` memuat kedua versi dengan alternatif `hreflang`.

## Galeri

- **Kartu:** tiap foto adalah komponen `card` Bootstrap. Tata letak 12 kolom asimetris tetap diatur CSS khusus.
- **Hover (perangkat dengan mouse):** foto membesar perlahan, keterangan naik dari bawah foto, dan nomor foto membesar. Di layar sentuh keterangan selalu tampil di bawah foto.
- **Animasi muncul bervariasi:** dari bawah, kiri, kanan, atau terbuka seperti tirai (`data-reveal`).
- **Parallax tipis:** kartu bergeser maksimum 12 px saat digulir, arah berlawanan antar kartu bersebelahan. Memakai properti CSS `translate` (terpisah dari animasi muncul).
- **Pratinjau buram:** kolom `photos.blur` berisi gambar 20 px (data URI). Tampil dibuat buram sebagai latar, lalu foto asli memudar masuk begitu selesai dimuat.
- **Slideshow:** tombol **Putar slideshow** di judul galeri dan tombol putar/jeda di lightbox (4,5 detik per foto, bilah kemajuan tipis, berhenti saat lightbox ditutup atau tab tidak aktif).
- **Kurangi gerak:** pengguna dengan pengaturan `prefers-reduced-motion` tidak mendapat parallax, bilah kemajuan, dan animasi muncul; kartu langsung tampil.
- Jika JavaScript Bootstrap gagal dimuat, klik foto membuka halaman foto yang dirender di server.
