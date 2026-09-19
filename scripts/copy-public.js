const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "..", "public");
const dest = path.join(__dirname, "..", "build", "public");

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const fromPath = path.join(from, entry.name);
    const toPath = path.join(to, entry.name);
    if (entry.isDirectory()) {
      copyDir(fromPath, toPath);
    } else {
      fs.copyFileSync(fromPath, toPath);
    }
  }
}

if (!fs.existsSync(src)) {
  console.log("No public/ folder to copy — skipping");
  process.exit(0);
}

copyDir(src, dest);
console.log("Copied public/ → build/public/");
