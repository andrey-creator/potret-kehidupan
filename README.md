# Potret Kehidupan — Full-stack Cloudflare starter

Website galeri foto personal ini sudah dipisahkan menjadi frontend statis, API JSON, database D1, dan penyimpanan file R2. Tampilan publik tetap minimalis seperti album foto sebelumnya; data galeri dapat dibaca dari D1 dan file foto dapat disimpan di R2.

## Teknologi

- **Frontend:** HTML + Bootstrap 5 CDN + CSS custom.
- **Frontend logic:** TypeScript, dikompilasi ke `dist/assets/app.js`.
- **API:** Cloudflare Pages Functions dengan format JSON.
- **Database:** Cloudflare D1 menggunakan migrasi `migrations/0001_create_photos.sql`.
- **Media:** Cloudflare R2 melalui endpoint upload dan media.
- **Source control:** GitHub.

## Menjalankan build lokal

```bash
npm install
npm run build
```

Output siap deploy berada di `dist/`. Untuk preview statis sederhana:

```bash
python3 -m http.server 3000 --directory dist
```

Frontend tetap memakai placeholder lokal jika `/api/photos` belum tersedia. Jadi desain dapat dilihat sebelum binding Cloudflare selesai.

## Setup Cloudflare

1. Buat project Pages yang terhubung ke repository GitHub.
2. Gunakan `main` sebagai production branch.
3. Build command: `npm ci && npm run build`.
4. Build output directory: `dist`.
5. Buat database D1 bernama `potret-kehidupan`, lalu salin ID-nya ke `wrangler.toml` atau binding Pages dashboard dengan nama `DB`.
6. Jalankan migrasi SQL dari `migrations/0001_create_photos.sql` pada database D1.
7. Buat bucket R2 bernama `potret-kehidupan-media`, lalu binding dengan nama `PHOTOS`.
8. Tambahkan secret Pages bernama `ADMIN_TOKEN`. Jangan masukkan nilai token ke GitHub.
9. Deploy ulang. Endpoint `GET /api/photos` akan membaca foto yang berstatus published dari D1.

Binding yang harus memiliki nama persis:

```text
DB       → D1 database
PHOTOS   → R2 bucket
```

## Endpoint API

### Publik (tanpa login)

```text
GET /api/photos          # foto yang published
GET /api/photos/:id      # hanya foto published
GET /api/img/:id         # file foto yang disimpan di D1
GET /api/media/:key      # file foto di R2 (opsional)
```

### Admin (semua di bawah /api/admin/*)

Semua endpoint tulis dikumpulkan di `/api/admin/*` agar bisa dilindungi Cloudflare Access dengan satu aturan path, tanpa mengganggu galeri publik. Selain Access, setiap endpoint tetap meminta header:

```text
Authorization: Bearer <ADMIN_TOKEN>
```

```text
POST   /api/admin/auth-check
POST   /api/admin/photo-upload     # upload foto (disimpan di D1) + metadata
POST   /api/admin/photos           # tambah metadata foto
PUT    /api/admin/photos/:id       # ubah metadata foto
DELETE /api/admin/photos/:id       # hapus foto
POST   /api/admin/upload           # upload ke R2 (butuh binding PHOTOS)
```

Halaman admin ada di `/admin`.

## Mengamankan admin dengan Cloudflare Access

1. Cloudflare Dashboard → **Zero Trust** → **Access** → **Applications** → **Add an application** → **Self-hosted**.
2. Tambahkan tiga destinasi pada domain situs Anda: `/admin`, `/admin.html`, dan `/api/admin/*`. Jangan lindungi `/` atau `/api/photos`, karena itu galeri publik.
3. Buat kebijakan **Allow** hanya untuk email Anda (misalnya *Emails* → alamat email Anda), dengan One-time PIN atau Google sebagai metode login.
4. Uji di jendela privat: `/admin` harus meminta login, `/` dan `/api/photos` harus tetap terbuka.

Catatan: Access bekerja pada hostname yang dikelola di Cloudflare. Jika situs hanya memakai `*.pages.dev`, aturan per path harus dibuat pada hostname tersebut; bila tidak berhasil, pakai custom domain. `ADMIN_TOKEN` tetap dipertahankan sebagai lapis kedua.

## Open Graph dan favicon

- `public/index.html` memuat tag `og:*` statis dan favicon (`public/favicon.svg`, `public/apple-touch-icon.png`).
- `functions/index.ts` menyisipkan `og:image`, `og:url`, dan `canonical` secara otomatis dari foto pertama galeri, karena crawler WhatsApp/Instagram tidak menjalankan JavaScript.

## Pratinjau lokal

Foto placeholder (picsum) hanya dimuat di `localhost` (`src/dev-photos.ts`) dan dibuang dari build Cloudflare Pages. Di produksi, jika galeri kosong atau API gagal, pengunjung melihat pesan status, bukan foto palsu.

## Mengganti foto

Upload foto lewat halaman `/admin`. Untuk pratinjau lokal tanpa database, ubah `src/dev-photos.ts`.

## Struktur penting

```text
public/index.html          # shell HTML publik
src/app.ts                 # TypeScript fetch, render, dan lightbox
src/styles.css             # gaya album
functions/api/photos.ts   # GET foto publik
functions/api/photos/[id].ts   # GET satu foto published
functions/api/admin/*      # semua endpoint tulis (dilindungi Access + token)
functions/index.ts         # menyisipkan og:image ke halaman utama
functions/api/media/[key].ts
migrations/0001_create_photos.sql
wrangler.toml
```
