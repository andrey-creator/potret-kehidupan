# Potret Kehidupan

Website galeri foto personal di Cloudflare Pages. Frontend statis (HTML + CSS + TypeScript), API JSON lewat Pages Functions, dan database D1. File foto juga disimpan di D1 (base64), jadi **tidak butuh R2**.

## Teknologi

- **Frontend:** HTML, CSS custom, dan TypeScript (dikompilasi ke `dist/assets/app.js`).
- **API:** Cloudflare Pages Functions (`functions/`).
- **Database + foto:** Cloudflare D1 (tabel `photos` dan `photo_files`).
- **Source control:** GitHub. Cloudflare Pages membangun otomatis setiap push ke `main`.

## Struktur penting

```text
public/index.html            # halaman publik
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
functions/api/img/[id].ts    # menyajikan file foto dari D1
functions/api/admin/*        # semua endpoint tulis (token admin)
migrations/                  # 0001 tabel photos, 0002 photo_files, 0003 width/height
scripts/                     # build.mjs dan prune-dev.mjs
wrangler.toml                # binding D1
```

## Setup Cloudflare (sekali saja)

1. Buat database D1 `potret-kehidupan`, salin `database_id` ke `wrangler.toml`.
2. Jalankan isi `migrations/0001_create_photos.sql`, `0002_photo_files.sql`, dan `0003_photo_dimensions.sql` secara berurutan (lewat Console D1 di dashboard atau `wrangler d1 migrations apply potret-kehidupan --remote`).
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

## Endpoint API

Publik:

```text
GET /api/photos          # foto yang published
GET /api/photos/:id      # satu foto published
GET /api/img/:id         # file foto dari D1
```

Admin (semua butuh header `Authorization: Bearer <ADMIN_TOKEN>`):

```text
POST   /api/admin/auth-check
POST   /api/admin/photo-upload   # multipart: file, caption, alt, size, width, height
GET    /api/admin/photos         # daftar lengkap, termasuk foto tersembunyi
POST   /api/admin/photos         # tambah metadata (src sudah ada)
PUT    /api/admin/photos/:id     # ubah metadata / status terbit
POST   /api/admin/photos/:id/image  # ganti file foto (multipart: file, width, height)
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
