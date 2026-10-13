import { rmSync, mkdirSync, copyFileSync, cpSync, existsSync } from "node:fs";

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist/assets/vendor", { recursive: true });
mkdirSync("dist/en", { recursive: true });

copyFileSync("public/index.html", "dist/index.html");
copyFileSync("public/en/index.html", "dist/en/index.html");
copyFileSync("public/admin.html", "dist/admin.html");
copyFileSync("public/404.html", "dist/404.html");
copyFileSync("public/_headers", "dist/_headers");
copyFileSync("public/favicon.svg", "dist/favicon.svg");
copyFileSync("public/apple-touch-icon.png", "dist/apple-touch-icon.png");
copyFileSync("src/styles.css", "dist/assets/styles.css");

// Bootstrap di-host sendiri (versi dikunci di package.json), bukan dari CDN.
copyFileSync("node_modules/bootstrap/dist/css/bootstrap.min.css", "dist/assets/vendor/bootstrap.min.css");
copyFileSync("node_modules/bootstrap/dist/js/bootstrap.bundle.min.js", "dist/assets/vendor/bootstrap.bundle.min.js");

// Bootstrap Icons (font ikon) juga di-host sendiri.
mkdirSync("dist/assets/vendor/bootstrap-icons/fonts", { recursive: true });
copyFileSync("node_modules/bootstrap-icons/font/bootstrap-icons.min.css", "dist/assets/vendor/bootstrap-icons/bootstrap-icons.min.css");
copyFileSync("node_modules/bootstrap-icons/font/fonts/bootstrap-icons.woff2", "dist/assets/vendor/bootstrap-icons/fonts/bootstrap-icons.woff2");
copyFileSync("node_modules/bootstrap-icons/font/fonts/bootstrap-icons.woff", "dist/assets/vendor/bootstrap-icons/fonts/bootstrap-icons.woff");

if (existsSync("public/photos")) {
  cpSync("public/photos", "dist/photos", { recursive: true });
}
