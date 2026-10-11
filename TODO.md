# TODO — Potret Kehidupan

## Sebelum dibagikan
- [ ] Jalankan `npm install` (memasang `bootstrap-icons`), lalu commit `package.json` dan `package-lock.json` yang berubah. Tanpa ini build Cloudflare Pages gagal.
- [ ] Jalankan migrasi `0004` dan `0005` di Console D1, lalu klik **Buat thumbnail foto lama** di `/admin`.
- [ ] Hapus semua foto placeholder dari `/admin` dan unggah foto asli.
- [ ] Pilih foto unggulan (★) yang bagus untuk header dan pratinjau link.
- [ ] Ganti teks pengantar di `public/index.html` dan `public/en/index.html` (komentar `EDIT TEKS PENGANTAR`).
- [ ] Isi terjemahan Inggris (tab English di Edit) untuk foto-foto pilihan.
- [ ] Isi tanggal, lokasi, dan cerita singkat untuk foto-foto pilihan.
- [ ] Uji pratinjau link di WhatsApp (halaman utama dan satu halaman `/foto/:id`).
- [ ] Unduh cadangan (.zip) dari `/admin` secara berkala.

## Opsional
- [ ] Daftarkan `/sitemap.xml` di Google Search Console.
- [ ] Fitur pulihkan (restore) dari file cadangan.
- [ ] Seret dan lepas untuk mengatur urutan; pilih banyak foto sekaligus.
- [ ] Lindungi `/admin` dan `/api/admin/*` dengan Cloudflare Access (butuh custom domain).
- [ ] Jika galeri ramai: pindahkan penyimpanan foto ke R2 atau tambahkan cache.
