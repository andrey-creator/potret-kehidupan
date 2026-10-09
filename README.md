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

### Publik

```text
GET /api/photos
GET /api/photos/:id
GET /api/media/:key
```

### Admin dengan token

Gunakan header berikut pada endpoint admin:

```text
Authorization: Bearer <ADMIN_TOKEN>
```

Endpoint tersedia:

```text
POST   /api/photos       # tambah metadata foto
PUT    /api/photos/:id  # ubah metadata foto
DELETE /api/photos/:id  # hapus metadata foto
POST   /api/upload      # upload file gambar ke R2
```

Contoh menambah metadata:

```bash
curl -X POST https://DOMAIN-ANDA/api/photos \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"src":"/api/media/gallery/foto.webp","alt":"Foto keluarga","caption":"Hari yang ingin diingat.","size":"wide","sort_order":20}'
```

Untuk production, token admin sederhana ini sebaiknya dikembangkan menjadi autentikasi pengguna sebelum panel admin dibuka untuk orang lain. Website publik sendiri tidak memiliki form atau panel admin, sehingga fokus album tetap terjaga.

## Mengganti foto

Untuk placeholder, ubah seed di `src/app.ts` atau isi data melalui migrasi D1. Untuk foto asli, upload dengan `/api/upload`, lalu gunakan nilai `src` yang dikembalikan endpoint tersebut pada record D1.

## Struktur penting

```text
public/index.html          # shell HTML publik
src/app.ts                 # TypeScript fetch, render, dan lightbox
src/styles.css             # gaya album
functions/api/photos.ts   # GET/POST foto
functions/api/photos/[id].ts
functions/api/upload.ts   # upload ke R2
functions/api/media/[key].ts
migrations/0001_create_photos.sql
wrangler.toml
```
