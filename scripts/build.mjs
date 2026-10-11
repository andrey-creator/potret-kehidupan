import { rmSync, mkdirSync, copyFileSync, cpSync, existsSync } from "node:fs";

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist/assets", { recursive: true });
copyFileSync("public/index.html", "dist/index.html");
copyFileSync("public/admin.html", "dist/admin.html");
copyFileSync("public/404.html", "dist/404.html");
copyFileSync("public/_headers", "dist/_headers");
copyFileSync("public/favicon.svg", "dist/favicon.svg");
copyFileSync("public/apple-touch-icon.png", "dist/apple-touch-icon.png");
copyFileSync("src/styles.css", "dist/assets/styles.css");
if (existsSync("public/photos")) {
  cpSync("public/photos", "dist/photos", { recursive: true });
}
