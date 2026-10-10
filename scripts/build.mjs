import { rmSync, mkdirSync, copyFileSync, cpSync, existsSync } from "node:fs";

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist/assets", { recursive: true });
copyFileSync("public/index.html", "dist/index.html");
copyFileSync("src/styles.css", "dist/assets/styles.css");
if (existsSync("public/photos")) {
  cpSync("public/photos", "dist/photos", { recursive: true });
}
