import { isSelfHosted } from "../../../lib/admin-auth";

export const dynamic = "force-dynamic";

const mimeTypes: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export async function GET(_request: Request, context: { params: Promise<{ filename: string }> }) {
  const { filename } = await context.params;
  const match = /^[0-9a-f-]{36}\.(jpg|png|webp|gif)$/.exec(filename);
  if (!isSelfHosted() || !match) return new Response("Photo not found.", { status: 404 });
  try {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const catalogPath = path.resolve(process.env.CATALOG_FILE?.trim() || ".data/products.json");
    const directory = path.join(path.dirname(catalogPath), "uploads");
    const bytes = await fs.readFile(path.join(directory, filename));
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": mimeTypes[match[1]],
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Photo not found.", { status: 404 });
  }
}
