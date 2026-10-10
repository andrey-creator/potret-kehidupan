# TODO — Potret Kehidupan

- [x] Header tipis menampilkan judul **“Potret Kehidupan”** dan subjudul satu baris **“Kepingan hidup dalam gambar.”**.
- [x] Galeri utama responsif bergaya masonry atau grid rapi berisi **12–20 foto** placeholder dari `picsum.photos`.
- [x] Setiap foto memiliki caption satu baris dengan panjang maksimal **8 kata** yang tampil di bawah foto atau saat hover.
- [x] Klik foto menampilkan **lightbox besar** lengkap dengan caption dan kontrol tutup yang mudah digunakan.
- [x] Halaman responsif dan optimal untuk HP serta desktop, dengan banyak ruang kosong agar foto tetap menjadi fokus.
- [x] Tersedia animasi halus saat elemen masuk ketika scroll dan efek hover dengan zoom lembut.
- [x] Gambar menggunakan **lazy loading** untuk membantu performa pemuatan halaman.
- [x] Footer minimal menampilkan nama, tahun, dan tautan media sosial opsional.
- [x] Tampilan publik memakai Bootstrap sebagai fondasi, dengan CSS custom untuk menjaga gaya album.
- [x] TypeScript dikompilasi melalui npm ke output `dist/` untuk deployment Cloudflare Pages.
- [x] API JSON publik `/api/photos` membaca metadata galeri dari Cloudflare D1.
- [x] API admin terproteksi token menyediakan tambah, ubah, dan hapus metadata foto.
- [x] Endpoint upload terproteksi menyimpan foto asli ke Cloudflare R2 dan endpoint media menyajikannya.
- [x] Migrasi SQL D1 dan seed 16 placeholder tersedia.
- [x] Dokumentasi GitHub + Cloudflare Pages, binding D1/R2, secret, build, dan API tersedia di `README.md`.
- [x] Seluruh implementasi publik tidak menambahkan artikel panjang, section tentang saya, dark mode, form publik, atau blog.
