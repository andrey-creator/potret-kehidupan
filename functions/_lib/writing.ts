// Tulisan terbaru dari jurnal tulisan pendamping (Catatan Kehidupan), ditampilkan di beranda.
// Diambil di server (tanpa CORS) lewat GET {CATATAN_URL}api/latest?n=3 dan disimpan di cache tepi 5 menit.
// Jika Catatan Kehidupan tidak bisa dihubungi, bagian ini disembunyikan dan beranda tetap normal.

import { formatDate, Lang } from "./i18n";
import { CATATAN_URL } from "./navbar";

export type Post = { id: string; date: string; tag: string; title: string; excerpt: string };

const LIMIT = 3;
const TEXT: Record<Lang, { heading: string; all: string }> = {
  id: { heading: "Dari jurnal tulisan", all: "Semua tulisan" },
  en: { heading: "From the written journal · in Indonesian", all: "All writing" }
};

const esc = (value: string): string =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

const isPost = (p: unknown): p is Post => {
  if (!p || typeof p !== "object") return false;
  const r = p as Record<string, unknown>;
  return typeof r.id === "string" && /^[a-z0-9-]{1,80}$/i.test(r.id) &&
    typeof r.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.date) &&
    typeof r.tag === "string" && typeof r.title === "string" && typeof r.excerpt === "string";
};

/** Tulisan terbaru, atau daftar kosong jika Catatan Kehidupan tidak bisa dihubungi. */
export async function latestWriting(): Promise<Post[]> {
  try {
    const res = await fetch(`${CATATAN_URL}api/latest?n=${LIMIT}`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(2500),
      cf: { cacheTtl: 300, cacheEverything: true }
    });
    if (!res.ok) return [];
    const data: unknown = await res.json();
    return Array.isArray(data) ? data.filter(isPost).slice(0, LIMIT) : [];
  } catch {
    return [];
  }
}

export function renderWriting(lang: Lang, posts: Post[]): string {
  const t = TEXT[lang];
  const items = posts.map((p) => {
    const href = `${CATATAN_URL}tulisan/${encodeURIComponent(p.id)}`;
    return `<li class="writing-item"><a class="writing-link" href="${esc(href)}" target="_blank" rel="noopener" lang="id">` +
      `<div class="writing-meta"><time datetime="${esc(p.date)}">${esc(formatDate("id", p.date))}</time><br>${esc(p.tag)}</div>` +
      `<div><h3 class="writing-title">${esc(p.title)}</h3><p class="writing-excerpt">${esc(p.excerpt)}</p></div></a></li>`;
  }).join("");
  return `<div class="writing-heading"><h2 id="writingTitle">${t.heading}</h2>` +
    `<a href="${esc(CATATAN_URL)}" target="_blank" rel="noopener">${t.all} →</a></div><ul class="writing-list">${items}</ul>`;
}
