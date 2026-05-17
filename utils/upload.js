const UPLOADS_DIR = "./public/uploads";
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_TYPES = {
  "image/jpeg": ".jpg",
  "image/png":  ".png",
  "image/webp": ".webp",
};

await Deno.mkdir(UPLOADS_DIR, { recursive: true });

export async function saveUpload(file) {
  if (!ALLOWED_TYPES[file.type]) {
    throw new Error(`Unsupported file type: ${file.type}`);
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error(`File exceeds ${MAX_SIZE_BYTES / 1024 / 1024} MB limit`);
  }

  const ext = ALLOWED_TYPES[file.type];
  const filename = `${crypto.randomUUID()}${ext}`;
  const filepath = `${UPLOADS_DIR}/${filename}`;

  const buffer = await file.arrayBuffer();
  await Deno.writeFile(filepath, new Uint8Array(buffer));

  return `/uploads/${filename}`;
}

export async function removeUpload(urlPath) {
  const filepath = `./public${urlPath}`;
  await Deno.remove(filepath);
}
