#!/usr/bin/env python3
"""Apply image uploads, kids' mirrors, and Custom Designed Sofas to AlexFurnitureWebsite.

Usage: python3 apply_alex_furniture_updates.py /path/to/AlexFurnitureWebsite
The script verifies its expected source snippets before changing any file.
It handles differences in indentation between the piece-photo controls.
Review `git diff` and test the website before deployment.
"""
from pathlib import Path
import sys

root = Path(sys.argv[1] if len(sys.argv) > 1 else ".").expanduser().resolve()
if not (root / "app/admin/page.tsx").is_file() or not (root / "package.json").is_file():
    sys.exit(f"Not an AlexFurnitureWebsite checkout: {root}")
changes = {}

def existing(path):
    return changes[path] if path in changes else (root / path).read_text(encoding="utf-8")

def replace(path, old, new):
    data = existing(path)
    count = data.count(old)
    if count != 1:
        raise RuntimeError(f"Expected one matching block in {path}; found {count}. No files have been changed. Your local source may differ from the patch version. Look for: {old.strip()[:120]!r}")
    changes[path] = data.replace(old, new, 1)

def add(path, content):
    if (root / path).exists():
        raise RuntimeError(f"New file already exists: {path}. No files have been changed.")
    changes[path] = content.lstrip("\n")

add("app/lib/admin-auth.ts", r'''
/** Reuse the catalog's existing password/email authorization for photo uploads. */
export function isSelfHosted() {
  return process.env.SELF_HOSTED === "true";
}

export function isAdmin(request: Request) {
  if (process.env.NODE_ENV !== "production") return true;
  const email = request.headers.get("oai-authenticated-user-email")?.toLowerCase();
  const allowed = new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((address) => address.trim().toLowerCase())
      .filter(Boolean),
  );
  const emailAllowed = Boolean(email && allowed.size > 0 && allowed.has(email));
  const expectedPassword = process.env.ADMIN_PASSWORD ?? "";
  const suppliedPassword = request.headers.get("x-admin-password") ?? "";
  const passwordAllowed =
    isSelfHosted() && expectedPassword.length >= 12 && suppliedPassword === expectedPassword;
  return emailAllowed || passwordAllowed;
}
''')

replace("app/api/products/route.ts",
        'import { automaticSetPrices, normalizeConfiguration, readConfiguration, type ProductConfiguration } from "../../lib/product-options";',
        'import { automaticSetPrices, normalizeConfiguration, readConfiguration, type ProductConfiguration } from "../../lib/product-options";\nimport { isAdmin, isSelfHosted } from "../../lib/admin-auth";')
replace("app/api/products/route.ts",
        '''function isSelfHosted() {
  return process.env.SELF_HOSTED === "true";
}

''', "")
replace("app/api/products/route.ts",
        '''function adminEmailSet() {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

function isAdmin(request: Request) {
  if (process.env.NODE_ENV !== "production") return true;
  const email = request.headers.get("oai-authenticated-user-email")?.toLowerCase();
  const allowed = adminEmailSet();
  const emailAllowed = Boolean(email && allowed.size > 0 && allowed.has(email));
  const expectedPassword = process.env.ADMIN_PASSWORD ?? "";
  const suppliedPassword = request.headers.get("x-admin-password") ?? "";
  const passwordAllowed =
    isSelfHosted() && expectedPassword.length >= 12 && suppliedPassword === expectedPassword;
  return emailAllowed || passwordAllowed;
}

''', "")

add("app/api/uploads/route.ts", r'''
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
    bytes[4] === 0x39 && bytes[5] === 0x61 ||
    bytes.length >= 6 && [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]
    .every((value, index) => bytes[index] === value)) {
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
''')

# Make the GIF signature grouping unmistakable.
replace("app/api/uploads/route.ts",
        '''  if (bytes.length >= 6 && [0x47, 0x49, 0x46, 0x38]
    .every((value, index) => bytes[index] === value) &&
    bytes[4] === 0x39 && bytes[5] === 0x61 ||
    bytes.length >= 6 && [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]
    .every((value, index) => bytes[index] === value)) {''',
        '''  if (bytes.length >= 6 && [0x47, 0x49, 0x46, 0x38]
    .every((value, index) => bytes[index] === value) &&
    ((bytes[4] === 0x39 || bytes[4] === 0x37) && bytes[5] === 0x61)) {''')

add("app/api/uploads/[filename]/route.ts", r'''
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
''')

add("app/components/CatalogImageField.tsx", r'''
"use client";

import { useState } from "react";

type Props = {
  label: string;
  value: string;
  onChange: (url: string) => void;
  adminPassword: string;
  onUploadStateChange: (uploading: boolean) => void;
  placeholder?: string;
};

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/** Preserves the photo link field, but also uploads a device image immediately. */
export default function CatalogImageField({ label, value, onChange, adminPassword, onUploadStateChange, placeholder }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function upload(file: File) {
    setError("");
    if (file.size > MAX_IMAGE_BYTES || !file.size) {
      setError("Choose an image smaller than 8 MB.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      setError("Choose a JPEG, PNG, WebP, or GIF image.");
      return;
    }
    setUploading(true);
    onUploadStateChange(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/uploads", {
        method: "POST",
        headers: adminPassword ? { "X-Admin-Password": adminPassword } : {},
        body,
      });
      const data = await response.json();
      if (!response.ok || typeof data.url !== "string") throw new Error(data.error || "Could not upload photo.");
      onChange(data.url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not upload photo.");
    } finally {
      setUploading(false);
      onUploadStateChange(false);
    }
  }

  return <div className="imageUploadField">
    <label>{label}<input type="text" inputMode="url" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder || "https://manufacturer.com/photo.jpg"} /></label>
    <label>Or upload a photo from your device
      <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploading} onChange={(event) => {
        const file = event.currentTarget.files?.[0];
        event.currentTarget.value = "";
        if (file) void upload(file);
      }} />
    </label>
    {uploading && <span role="status">Uploading photo…</span>}
    {error && <span className="imageUploadError" role="alert">{error}</span>}
  </div>;
}
''')

replace("app/components/CatalogOptionsEditor.tsx", 'import { useState } from "react";',
        'import { useState } from "react";\nimport CatalogImageField from "./CatalogImageField";')
old_photo = '''export function PhotoEditor({ value, colors, onChange }: { value: PriceOptions; colors: string[]; onChange: (value: PriceOptions) => void }) {
  const images = value.images || [];
  return <fieldset className="guidedBlock"><legend>More photos / color photos</legend><p>Add approved image links. Assign a color to show its photos when a customer selects that color.</p>{images.map((photo,index) => <div className="photoEditorRow" key={index}><label>Photo link<input type="url" value={photo.url} onChange={(event) => onChange({...value, images: images.map((item,i)=>i===index?{...item,url:event.target.value}:item)})} placeholder="https://…" /></label><label>Photo color<select value={photo.color} onChange={(event) => onChange({...value, images: images.map((item,i)=>i===index?{...item,color:event.target.value}:item)})}><option value="">All colors / general photo</option>{[...new Set([...colors,...(photo.color ? [photo.color] : [])])].map((color)=><option key={color}>{color}</option>)}</select></label>{photo.url && <img src={photo.url} alt={`Photo ${index+1} preview`} />}<button type="button" onClick={()=>onChange({...value,images:images.filter((_,i)=>i!==index)})}>Remove photo</button></div>)}<button className="addPieceButton" type="button" disabled={images.length>=30} onClick={()=>onChange({...value,images:[...images,{url:"",color:""}]})}>+ Add photo</button></fieldset>;
}
'''
new_photo = '''export function PhotoEditor({ value, colors, onChange, adminPassword, onUploadStateChange }: {
  value: PriceOptions;
  colors: string[];
  onChange: (value: PriceOptions) => void;
  adminPassword: string;
  onUploadStateChange: (uploading: boolean) => void;
}) {
  const images = value.images || [];
  return <fieldset className="guidedBlock">
    <legend>More photos / color photos</legend>
    <p>Add approved photo links or upload images. Assign a color to show its photos when a customer selects that color.</p>
    {images.map((photo, index) => <div className="photoEditorRow" key={index}>
      <CatalogImageField label="Photo link" value={photo.url} onChange={(url) => onChange({ ...value, images: images.map((item, i) => i === index ? { ...item, url } : item) })} adminPassword={adminPassword} onUploadStateChange={onUploadStateChange} />
      <label>Photo color<select value={photo.color} onChange={(event) => onChange({ ...value, images: images.map((item, i) => i === index ? { ...item, color: event.target.value } : item) })}>
        <option value="">All colors / general photo</option>
        {[...new Set([...colors, ...(photo.color ? [photo.color] : [])])].map((color) => <option key={color}>{color}</option>)}
      </select></label>
      {photo.url && <img src={photo.url} alt={`Photo ${index + 1} preview`} />}
      <button type="button" onClick={() => onChange({ ...value, images: images.filter((_, i) => i !== index) })}>Remove photo</button>
    </div>)}
    <button className="addPieceButton" type="button" disabled={images.length >= 30} onClick={() => onChange({ ...value, images: [...images, { url: "", color: "" }] })}>+ Add photo</button>
  </fieldset>;
}
'''
replace("app/components/CatalogOptionsEditor.tsx",old_photo,new_photo)

replace("app/components/catalog-options.css", '.photoEditorRow { display:grid;',
        '.imageUploadField { display:grid; gap:10px; margin:12px 0; }\n.imageUploadField input[type=file] { max-width:100%; }\n.imageUploadError { color:#a22318; font-weight:650; }\n.photoEditorRow { display:grid;')

replace("app/lib/product-options.ts",
        '      if (!/^https?:\\/\\//i.test(url)) throw new Error("Photo links must begin with https:// or http://.");',
        '      if (!/^https?:\\/\\//i.test(url) && !/^\\/api\\/uploads\\/[0-9a-f-]{36}\\.(jpg|png|webp|gif)$/.test(url)) throw new Error("Use a http(s) link or an uploaded photo.");')

replace("app/admin/page.tsx", 'import Link from "next/link";',
        'import Link from "next/link";\nimport CatalogImageField from "../components/CatalogImageField";')
replace("app/admin/page.tsx",
        '"Living Room Sets", "Wall Units", "Sectionals", "Sleeper Sofas", "Bookcases",',
        '"Living Room Sets", "Custom Designed Sofas", "Wall Units", "Sectionals", "Sleeper Sofas", "Bookcases",')
replace("app/admin/page.tsx",
        'items: ["Bedroom Sets", "Beds", "Daybeds", "Chests", "Dresser", "Headboards", "Nightstands"],',
        'items: ["Bedroom Sets", "Beds", "Daybeds", "Chests", "Dresser", "Mirrors", "Headboards", "Nightstands"],')
replace("app/admin/page.tsx",
        'pieceOptions: ["Beds", "Daybeds", "Dresser", "Nightstands", "Chests", "Headboards"],',
        'pieceOptions: ["Beds", "Daybeds", "Dresser", "Mirrors", "Nightstands", "Chests", "Headboards"],')
replace("app/admin/page.tsx",
        '  const [busy, setBusy] = useState(false);',
        '  const [busy, setBusy] = useState(false);\n  const [uploadCount, setUploadCount] = useState(0);')
replace("app/admin/page.tsx",
        '''  function protectedHeaders(password = adminPassword): Record<string, string> {
    return password ? { "X-Admin-Password": password } : {};
  }
''',
        '''  function protectedHeaders(password = adminPassword): Record<string, string> {
    return password ? { "X-Admin-Password": password } : {};
  }

  function trackUpload(uploading: boolean) {
    setUploadCount((current) => Math.max(0, current + (uploading ? 1 : -1)));
  }
''')
replace("app/admin/page.tsx",
        '    event.preventDefault();\n\n    if (mode === "single"',
        '    event.preventDefault();\n\n    if (uploadCount > 0) { setStatus("Finish uploading photos before saving."); return; }\n    if (mode === "single"')
replace("app/admin/page.tsx",
        '''                <label>Product photo URL<input value={form.imageUrl} onChange={(event) => update("imageUrl", event.target.value)} placeholder="https://manufacturer.com/product-photo.jpg" /></label>
                <PhotoEditor value={form.configuration} colors={form.colors} onChange={(value) => update("configuration", {...form.configuration,...value})} />''',
        '''                <CatalogImageField label="Product photo URL" value={form.imageUrl} onChange={(url) => update("imageUrl", url)} adminPassword={adminPassword} onUploadStateChange={trackUpload} />
                <PhotoEditor value={form.configuration} colors={form.colors} onChange={(value) => update("configuration", {...form.configuration,...value})} adminPassword={adminPassword} onUploadStateChange={trackUpload} />''')
# Match the two JSX controls separately so indentation between lines does not matter.
replace("app/admin/page.tsx",
        '<label>Piece photo URL, optional<input value={piece.imageUrl} onChange={(event) => updatePiece(piece.localId, "imageUrl", event.target.value)} placeholder="Leave blank to use the set photo" /></label>',
        '<CatalogImageField label="Piece photo URL, optional" value={piece.imageUrl} onChange={(url) => updatePiece(piece.localId, "imageUrl", url)} adminPassword={adminPassword} onUploadStateChange={trackUpload} placeholder="Leave blank to use the set photo" />')
replace("app/admin/page.tsx",
        '<PhotoEditor value={piece.configuration} colors={form.colors} onChange={(value)=>updatePiece(piece.localId,"configuration",value)} />',
        '<PhotoEditor value={piece.configuration} colors={form.colors} onChange={(value)=>updatePiece(piece.localId,"configuration",value)} adminPassword={adminPassword} onUploadStateChange={trackUpload} />')
replace("app/admin/page.tsx",
        '<button className="primaryAdminButton" disabled={busy}>\n                  {form.id ?',
        '<button className="primaryAdminButton" disabled={busy || uploadCount > 0}>\n                  {form.id ?')
replace("app/page.tsx", '''      "Living Room Sets",
      "Wall Units",''', '''      "Living Room Sets",
      "Custom Designed Sofas",
      "Wall Units",''')
replace("app/page.tsx", '''      "Dresser",
      "Headboards",
      "Nightstands",
    ],
  },
  {
    label: "Entertainment",''', '''      "Dresser",
      "Mirrors",
      "Headboards",
      "Nightstands",
    ],
  },
  {
    label: "Entertainment",''')

replace("README.md", '''Open `/admin` from the same local URL.
''', '''Open `/admin` from the same local URL.

Product photo fields accept licensed image URLs **or** a file chosen from your
computer (JPEG, PNG, WebP, or GIF, up to 8 MB). File upload is available when
`SELF_HOSTED=true`; uploaded photos are saved alongside the catalog in
`.data/uploads/`, then served from `/api/uploads/<filename>`. The URL-only
option remains available on other hosting providers. The photo chooser works
for the main product photo, individual set pieces, and extra/color photos.
''')
replace("MACBOOK_HOSTING.md", '''Product images are loaded from their licensed external URLs, so the
Mac does not need to resize or serve large image libraries.''', '''Product photos can use licensed external URLs or images uploaded through
`/admin`. Uploaded images are served by the Mac and stored in `.data/uploads/`.
Use reasonably compressed photos and leave room on the Mac's disk.''')
replace("MACBOOK_HOSTING.md", '''if the Mac sleeps, loses power or Internet, reboots before login, or develops a
hardware problem. Keep the Mac ventilated, connected to power and Ethernet when
possible, and keep a backup of `.data/products.json`.''', '''if the Mac sleeps, loses power or Internet, reboots before login, or develops a
hardware problem. Keep the Mac ventilated, connected to power and Ethernet when
possible, and back up both `.data/products.json` and `.data/uploads/`.''')
replace("MACBOOK_HOSTING.md", '''Back up this file after catalog changes:

```text
.data/products.json
```''', '''Back up the catalog and uploaded photos after catalog changes:

```text
.data/products.json
.data/uploads/
```

Uploaded image URLs continue to work after restarting the website as long as
the `.data/uploads/` folder is preserved. Deleting a product does not
automatically delete its uploaded photos.''')

for path, content in changes.items():
    destination = root / path
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(content, encoding="utf-8")
    print(f"Updated {path}")
print("\nReview `git diff`, then run your usual build and tests before deploying.")
