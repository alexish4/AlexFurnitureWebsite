import { isAdmin, isSelfHosted } from "../../lib/admin-auth";

export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

type ImageType = { extension: "jpg" | "png" | "webp" | "gif"; mime: string };

function imageType(bytes: Uint8Array): ImageType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { extension: "jpg", mime: "image/jpeg" };
  }
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
    .every((value, index) => bytes[index] === value)) {
    return { extension: "png", mime: "image/png" };
  }
  if (bytes.length >= 12 && [0x52, 0x49, 0x46, 0x46]
    .every((value, index) => bytes[index] === value) &&
    [0x57, 0x45, 0x42, 0x50].every((value, index) => bytes[index + 8] === value)) {
    return { extension: "webp", mime: "image/webp" };
  }
  if (bytes.length >= 6 && [0x47, 0x49, 0x46, 0x38]
    .every((value, index) => bytes[index] === value) &&
    ((bytes[4] === 0x39 || bytes[4] === 0x37) && bytes[5] === 0x61)) {
    return { extension: "gif", mime: "image/gif" };
  }
  return null;
}

export async function POST(request: Request) {
  if (!isAdmin(request)) return Response.json({ error: "Admin access required." }, { status: 403 });
  if (!isSelfHosted()) {
    return Response.json({ error: "File uploads are available on the self-hosted Mac catalog. Use a photo URL on the hosted site." }, { status: 501 });
  }
  const declaredSize = Number(request.headers.get("content-length") || 0);
  if (declaredSize > MAX_IMAGE_BYTES + 4096) {
    return Response.json({ error: "Choose an image smaller than 8 MB." }, { status: 413 });
  }
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return Response.json({ error: "Choose a photo to upload." }, { status: 400 });
    if (!file.size || file.size > MAX_IMAGE_BYTES) {
      return Response.json({ error: "Choose an image smaller than 8 MB." }, { status: 413 });
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const detected = imageType(bytes);
    if (!detected || (file.type && file.type !== detected.mime)) {
      return Response.json({ error: "Use a JPEG, PNG, WebP, or GIF image." }, { status: 400 });
    }
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const catalogPath = path.resolve(process.env.CATALOG_FILE?.trim() || ".data/products.json");
    const directory = path.join(path.dirname(catalogPath), "uploads");
    await fs.mkdir(directory, { recursive: true });
    const filename = `${crypto.randomUUID()}.${detected.extension}`;
    await fs.writeFile(path.join(directory, filename), bytes, { flag: "wx", mode: 0o644 });
    return Response.json({ url: `/api/uploads/${filename}` }, { status: 201 });
  } catch (error) {
    console.error("Catalog photo upload failed:", error);
    return Response.json({ error: "Could not save the photo. Check available disk space." }, { status: 500 });
  }
}
