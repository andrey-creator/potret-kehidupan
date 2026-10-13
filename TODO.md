# TODO — Potret Kehidupan

## Sebelum dibagikan
- [ ] Jalankan migrasi `0004` sampai `0007` di Console D1, lalu klik **Siapkan foto lama** di `/admin` (thumbnail + pratinjau buram).
- [ ] Hapus semua foto placeholder dari `/admin` dan unggah foto asli.
- [ ] Pilih foto unggulan (★) yang bagus untuk header dan pratinjau link.
- [ ] Ganti kalimat pembuka dan paragraf pengantar lewat `/admin` (kartu Teks halaman awal).
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
