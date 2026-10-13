// Verifikasi kepemilikan situs untuk Google Search Console (metode "berkas HTML").
// Dilayani lewat Function agar alamat persisnya, /google5d684f16a8fe6a6e.html, menjawab 200 langsung.
// Cloudflare Pages mengalihkan berkas statis *.html ke alamat tanpa ".html" (308), dan pengalihan itu
// bisa membuat verifikasi Google gagal. Jangan hapus berkas ini selama situs ingin tetap terverifikasi.
export const onRequestGet: PagesFunction = () => new Response(
  "google-site-verification: google5d684f16a8fe6a6e.html",
  { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=3600" } }
);

// HEAD (dipakai pemeriksa tautan dan beberapa crawler) dijawab seperti GET; runtime membuang isi respons.
export const onRequestHead = onRequestGet;
