# Rencana Implementasi — Potret Kehidupan

## Arah produk
Website satu halaman untuk berbagi perjalanan hidup lewat foto dan caption singkat. Tampilan publik tetap tenang seperti album digital, tanpa artikel panjang, profil, form publik, blog, atau dark mode. Data galeri disiapkan agar dapat dikelola berkelanjutan melalui API JSON.

## Arsitektur yang dipilih

- **Source control:** GitHub sebagai repository utama.
- **Frontend:** HTML + Bootstrap 5 CDN + CSS custom dan TypeScript.
- **Build:** TypeScript dikompilasi ke `dist/assets/app.js` melalui npm.
- **Hosting:** Cloudflare Pages terhubung ke branch `main` GitHub.
- **Backend:** Cloudflare Pages Functions pada `/functions/api`.
- **Database:** Cloudflare D1 untuk metadata foto, caption, urutan, kategori lanjutan, dan status publish.
- **Media:** Cloudflare R2 untuk file foto; endpoint `/api/upload` menyimpan file dan `/api/media/:key` menyajikannya.
- **Keamanan awal:** endpoint mutasi memakai `ADMIN_TOKEN` sebagai secret Cloudflare. Panel admin publik belum dibuat agar album tetap fokus dan tidak menambah permukaan serangan.

## Alur data

1. Browser meminta `GET /api/photos`.
2. Pages Function membaca foto published dari D1.
3. TypeScript merender kartu galeri, lazy loading, reveal saat scroll, dan lightbox.
4. File foto asli diunggah ke `/api/upload` dengan token admin dan disimpan di R2.
5. Metadata `src`, alt text, caption, ukuran, dan urutan disimpan melalui endpoint JSON D1.
6. Jika API belum dikonfigurasi atau gagal, frontend memakai 16 placeholder sehingga preview visual tetap tersedia.

## Desain

### Design movement
**Quiet editorial / digital photo album** — perpaduan album cetak modern, galeri kontemporer, dan ritme editorial yang memberi jeda di antara momen.

### Core principles
1. **Foto memimpin:** teks hanya membantu orientasi dan memberi konteks satu napas.
2. **Jeda yang terasa:** ruang kosong lebar dan ritme vertikal membuat tiap foto punya ruang bernapas.
3. **Hangat, bukan dekoratif:** palet tulang, tinta, dan sage memberi rasa personal tanpa ornamen berlebih.
4. **Interaksi pelan:** zoom lembut, reveal saat scroll, dan lightbox yang tidak mengagetkan.

### Color philosophy
Latar **bone** `#f1eee8` terasa seperti halaman album yang sudah sering disentuh; tinta hijau-gelap `#202521` menjaga kontras yang tenang; aksen **sage** `#7b8a78` menjadi warna kepemilikan yang mengingatkan pada cahaya sore dan lanskap hidup.

### Layout paradigm
Layout editorial asimetris berbasis CSS Grid dengan beberapa foto lebih besar sebagai titik istirahat. Bootstrap dipakai sebagai fondasi utilitas dan kompatibilitas, bukan sebagai gaya visual dominan.

### Signature elements
Garis indeks tipis, nomor momen kecil, dan titik sage sebagai signature wordmark.

### Interaction and animation
Klik foto membuka lightbox besar; tombol prev/next dan keyboard menjaga alur melihat foto tetap natural. Kartu masuk dengan IntersectionObserver, foto memakai zoom lembut, dan `prefers-reduced-motion` dihormati.

### Typography system
Wordmark/headline memakai Arial/Helvetica dengan bobot ringan; caption memakai Helvetica Neue/Arial; metadata memakai sans-serif uppercase bertracking lega.

## Struktur proyek

- `public/index.html` — shell HTML publik dan Bootstrap CDN.
- `src/app.ts` — data fallback, API fetch, render galeri, lazy loading, lightbox, keyboard interaction.
- `src/styles.css` — gaya album dan responsive layout.
- `functions/api/photos.ts` — GET publik dan POST terproteksi.
- `functions/api/photos/[id].ts` — GET/PUT/DELETE item foto.
- `functions/api/upload.ts` — upload gambar ke R2.
- `functions/api/media/[key].ts` — penyajian objek R2.
- `migrations/0001_create_photos.sql` — tabel dan seed placeholder D1.
- `wrangler.toml` — deklarasi binding DB/R2.
- `README.md` — panduan build dan deployment GitHub–Cloudflare.
