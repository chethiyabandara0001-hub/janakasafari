import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const { values: options } = parseArgs({
  options: {
    host: { type: "string" },
    port: { type: "string" },
    dist: { type: "boolean" },
  },
});

const root = fileURLToPath(new URL(options.dist ? "../dist/" : "../", import.meta.url));
const host = options.host ?? "0.0.0.0";
const port = Number(options.port ?? process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer from 1 to 65535.");
}

const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".jpg", "image/jpeg"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
  [".woff2", "font/woff2"],
  [".txt", "text/plain; charset=utf-8"],
]);

// Only the site's HTML pages and bundled assets are public.
const publicPath = /^(?:[a-z0-9-]+\.html|assets\/(?:[a-z0-9_-]+\/)*[a-z0-9_-][a-z0-9_.-]*\.[a-z0-9]+)$/i;

function getPublicFile(requestUrl) {
  try {
    const pathname = decodeURIComponent(new URL(requestUrl, "http://localhost").pathname);
    if (pathname === "/") return "index.html";
    const relativePath = pathname.slice(1);
    return publicPath.test(relativePath) ? relativePath : null;
  } catch {
    return null;
  }
}

const server = createServer(async (request, response) => {
  const headOnly = request.method === "HEAD";
  if (request.method !== "GET" && !headOnly) {
    response.writeHead(405, { Allow: "GET, HEAD" }).end();
    return;
  }

  const file = getPublicFile(request.url);
  const type = file && contentTypes.get(extname(file).toLowerCase());
  if (!type) {
    response.writeHead(404).end();
    return;
  }

  let bytes;
  try {
    bytes = await readFile(join(root, file));
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "EISDIR") {
      response.writeHead(404).end();
    } else {
      console.error(error);
      response.writeHead(500).end();
    }
    return;
  }

  response.writeHead(200, {
    "Content-Type": type,
    "Content-Length": bytes.length,
    "Cache-Control": "no-cache",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(headOnly ? undefined : bytes);
});

server.listen(port, host, () => {
  console.log(`Safari site listening on ${host}:${port}`);
});
