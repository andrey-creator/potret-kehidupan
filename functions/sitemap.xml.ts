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

  const urls = [`  <url><loc>${origin}/</loc></url>`].concat(rows.map((row) => {
    const lastmod = row.updated_at && /^\d{4}-\d{2}-\d{2}/.test(row.updated_at) ? `<lastmod>${row.updated_at.slice(0, 10)}</lastmod>` : "";
    return `  <url><loc>${origin}/foto/${row.id}</loc>${lastmod}</url>`;
  }));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
  return new Response(xml, {
    headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=600" }
  });
};
