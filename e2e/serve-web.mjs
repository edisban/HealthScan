// Minimal static server for the exported web app: node serve-web.mjs <dir> <port>
// Unknown paths fall back to index.html, as the app is a single page.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(process.argv[2] ?? "../mobile/dist");
const port = Number(process.argv[3] ?? 8081);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".ico": "image/x-icon",
};

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url ?? "/", "http://localhost").pathname);
  // normalize + resolve keeps every request inside the root folder
  const file = resolve(join(root, normalize(path)));
  const target = file.startsWith(root) && extname(file) ? file : join(root, "index.html");
  try {
    const body = await readFile(target);
    res.writeHead(200, { "Content-Type": types[extname(target)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404).end("Not found");
  }
}).listen(port, () => console.log(`Serving ${root} on http://localhost:${port}`));
