// Foto placeholder hanya untuk pratinjau lokal. Di build Cloudflare Pages (CF_PAGES=1) file ini dibuang
// dari output sehingga tidak bisa dimuat siapa pun di produksi.
import { rmSync } from "node:fs";

if (process.env.CF_PAGES) {
  rmSync("dist/assets/dev-photos.js", { force: true });
  console.log("dev-photos.js dihapus dari output produksi.");
}
