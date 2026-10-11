# TODO — Potret Kehidupan

## Sebelum dibagikan
- [ ] Jalankan migrasi `0004` di Console D1, lalu klik **Buat thumbnail foto lama** di `/admin`.
- [ ] Hapus semua foto placeholder dari `/admin` dan unggah foto asli.
- [ ] Pilih foto unggulan (★) yang bagus untuk header dan pratinjau link.
- [ ] Ganti teks pengantar di `public/index.html` (komentar `EDIT TEKS PENGANTAR DI SINI`).
- [ ] Isi tanggal, lokasi, dan cerita singkat untuk foto-foto pilihan.
- [ ] Uji pratinjau link di WhatsApp (halaman utama dan satu halaman `/foto/:id`).
- [ ] Unduh cadangan (.zip) dari `/admin` secara berkala.

## Opsional
- [ ] Hapus link Bootstrap CDN dari `public/index.html` (tidak ada kelas Bootstrap yang dipakai), lalu cek tampilan di browser.
- [ ] Kembalikan fokus ke foto yang diklik saat lightbox ditutup; dukungan geser di layar sentuh.
- [ ] Fitur pulihkan (restore) dari file cadangan.
- [ ] Seret dan lepas untuk mengatur urutan; pilih banyak foto sekaligus.
- [ ] Lindungi `/admin` dan `/api/admin/*` dengan Cloudflare Access (butuh custom domain).
- [ ] Jika galeri ramai: pindahkan penyimpanan foto ke R2 atau tambahkan cache.
