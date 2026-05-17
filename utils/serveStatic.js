const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css":  "text/css",
  ".js":   "application/javascript",
  ".json": "application/json",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg":  "image/svg+xml",
  ".ico":  "image/x-icon",
};

export async function serveStatic(urlPath) {
  const filepath = `./public${urlPath}`;
  const ext = filepath.slice(filepath.lastIndexOf("."));

  try {
    const bytes = await Deno.readFile(filepath);
    return new Response(bytes, {
      headers: { "content-type": MIME_TYPES[ext] ?? "application/octet-stream" },
    });
  } catch {
    return new Response("Not Found", { status: 404 });
  }
}
