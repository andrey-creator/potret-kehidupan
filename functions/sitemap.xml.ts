type Env = {
  DB: D1Database;
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const origin = new URL(request.url).origin;
  let rows: { id: number; updated_at: string | null }[] = [];
  try {
    if (env.DB) {
      ({ results: rows } = await env.DB.prepare(
        "SELECT id, updated_at FROM photos WHERE is_published = 1 ORDER BY sort_order ASC, id ASC"
      ).all<{ id: number; updated_at: string | null }>());
    }
  } catch (error) {
    console.error("GET /sitemap.xml failed", error);
  }

  // Setiap halaman punya versi Indonesia dan Inggris yang saling menaut (hreflang).
  const entry = (idPath: string, enPath: string, lastmod: string): string => {
    const alternates =
      `<xhtml:link rel="alternate" hreflang="id" href="${origin}${idPath}"/>` +
      `<xhtml:link rel="alternate" hreflang="en" href="${origin}${enPath}"/>`;
    return [idPath, enPath].map((path) => `  <url><loc>${origin}${path}</loc>${lastmod}${alternates}</url>`).join("\n");
  };

  const urls = [entry("/", "/en/", "")].concat(rows.map((row) => {
    const lastmod = row.updated_at && /^\d{4}-\d{2}-\d{2}/.test(row.updated_at) ? `<lastmod>${row.updated_at.slice(0, 10)}</lastmod>` : "";
    return entry(`/foto/${row.id}`, `/en/photo/${row.id}`, lastmod);
  }));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join("\n")}\n</urlset>\n`;
  return new Response(xml, {
    headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=600" }
  });
};

// HEAD (dipakai pemeriksa tautan dan beberapa crawler) dijawab seperti GET; runtime membuang isi respons.
export const onRequestHead = onRequestGet;
