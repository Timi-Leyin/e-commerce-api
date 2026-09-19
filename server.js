/**
 * Production entrypoint for Render / hosts.
 * Do NOT run `node server.ts` — that file is TypeScript source only.
 */
const path = require("path");
const fs = require("fs");

const built = path.join(__dirname, "build", "server.js");

if (!fs.existsSync(built)) {
  console.error(
    "Missing build/server.js. On Render set:\n" +
      "  Build Command: npm install && npm run build\n" +
      "  Start Command: npm start\n",
  );
  process.exit(1);
}

require(built);
