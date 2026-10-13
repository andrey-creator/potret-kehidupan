# TODO — Potret Kehidupan

## Sebelum dibagikan
- [ ] Jalankan migrasi `0004`, `0005`, dan `0006` di Console D1, lalu klik **Siapkan foto lama** di `/admin` (thumbnail + pratinjau buram).
- [ ] Hapus semua foto placeholder dari `/admin` dan unggah foto asli.
- [ ] Pilih foto unggulan (★) yang bagus untuk header dan pratinjau link.
- [ ] Ganti teks pengantar di `scripts/generate-pages.mjs` (properti `lede`, Indonesia dan Inggris), lalu jalankan `npm run generate:pages`.
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
