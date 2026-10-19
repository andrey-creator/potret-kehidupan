# Potret Kehidupan

Website galeri foto personal di Cloudflare Pages.

## Teknologi

- **Frontend:** HTML, CSS custom, dan TypeScript.
- **Bootstrap 5.3.3 + Bootstrap Icons 1.11.3:**
- **Database + foto:** Cloudflare D1.
- **Source control:** GitHub, Cloudflare Pages.

## Struktur penting

```text
public/index.html            # halaman publik (Indonesia) — DIHASILKAN oleh scripts/generate-pages.mjs
public/en/index.html         # halaman publik (Inggris) — dihasilkan oleh skrip yang sama
scripts/generate-pages.mjs   # templat tunggal kedua halaman publik; jalankan: npm run generate:pages
config/site-text.json        # teks bawaan kalimat pembuka dan paragraf pengantar (Indonesia + Inggris)
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
functions/_lib/              # auth, images, photos (kueri bertingkat), i18n, home, photo-page, navbar, site (teks halaman awal)
functions/sitemap.xml.ts     # /sitemap.xml
functions/robots.txt.ts      # /robots.txt
functions/api/admin/*        # semua endpoint tulis (token admin)
migrations/                  # 0001 tabel photos, 0002 photo_files, 0003 width/height, 0004 thumbnail + tanggal/lokasi/cerita, 0005 teks bahasa Inggris, 0006 pratinjau buram, 0007 teks halaman awal
scripts/                     # build.mjs dan prune-dev.mjs
wrangler.toml                # binding D1
```

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

Admin:

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
GET    /api/admin/settings       # teks halaman awal yang berlaku + bawaan
PUT    /api/admin/settings       # { note_id?, lede_id?, note_en?, lede_en? }; null/kosong = bawaan
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

## Terhubung dengan Catatan Kehidupan

Jurnal tulisan pendamping ada di proyek terpisah (`https://catatan-kehidupan.pages.dev/`). Tautannya terpasang di:

- navbar (menu **Tulisan** / **Writing**), baik di beranda (`scripts/generate-pages.mjs`) maupun halaman foto (`functions/_lib/navbar.ts`);
- kalimat "Pendamping: Catatan Kehidupan" di bawah tombol beranda dan di footer;
- data terstruktur (JSON-LD Person + WebSite) di `functions/_lib/home.ts`, yang menautkan nama penulis dengan kedua situs dan akun sosialnya.

Jika alamat Catatan Kehidupan berubah (mis. memakai domain sendiri), ganti `CATATAN` di `scripts/generate-pages.mjs`,
`CATATAN_URL` di `functions/_lib/navbar.ts`, lalu jalankan `npm run generate:pages`.
