# Arsitektur — Potret Kehidupan

## Arah produk
Satu halaman untuk berbagi perjalanan hidup lewat foto dan caption singkat. Tampilan tenang seperti album digital: tanpa blog, tanpa form publik, tanpa dark mode.

## Arsitektur
- **Hosting:** Cloudflare Pages, terhubung ke branch `main` di GitHub.
- **Frontend:** `public/index.html`, `src/styles.css`, dan `src/app.ts` (dikompilasi ke `dist/assets/app.js`).
- **API:** Pages Functions di `functions/`. Endpoint publik di `/api/photos`, `/api/img`; endpoint tulis di `/api/admin/*`.
- **Data:** D1. Tabel `photos` menyimpan metadata (caption, alt, ukuran, urutan, lebar, tinggi, status publish, tanggal, lokasi, cerita). Tabel `photo_files` menyimpan file foto dan thumbnail (base64).
- **Halaman foto:** `/foto/:id` dirender di server (`functions/foto/[id].ts`) dengan `og:image` per foto, plus `/sitemap.xml` dan `/robots.txt`.
- **Keamanan:** `ADMIN_TOKEN` sebagai secret Pages, dibandingkan constant-time. SVG ditolak.

## Alur data
1. Browser meminta `GET /api/photos`.
2. Fungsi membaca foto published dari D1, diurutkan menurut `sort_order`.
3. `app.ts` merender foto unggulan (foto pertama) di header, sisanya di galeri, dan lightbox.
4. Upload lewat `/admin`: foto dikecilkan di browser, dikirim ke `/api/admin/photo-upload`, disimpan di D1.
5. `functions/index.ts` menyisipkan `og:image` dari foto unggulan agar pratinjau link muncul di WhatsApp dan media sosial.

## Batasan yang diketahui
- Foto disajikan lewat fungsi (satu panggilan per foto; grid memakai thumbnail agar ringan). Untuk traffic besar, pertimbangkan R2 atau cache.
- Satu foto maksimum sekitar 1,3 MB karena batas baris D1.
