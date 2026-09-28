import { asc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { products } from "../../../db/schema";

export const dynamic = "force-dynamic";

type ProductInput = {
  id?: string;
  slug?: string;
  sku?: string;
  name?: string;
  description?: string;
  price?: number | string;
  compareAtPrice?: number | string | null;
  categories?: string[] | string;
  sizes?: string[] | string;
  colors?: string[] | string;
  imageUrl?: string;
  badge?: string;
  vendor?: string;
  status?: "active" | "draft";
  featured?: boolean | string | number;
};

type StoredProduct = ReturnType<typeof normalize>;
type LocalStoredProduct = Omit<StoredProduct, "updatedAt"> & {
  updatedAt: string;
};

const sampleProducts: ProductInput[] = [
  {
    id: "p1",
    sku: "AF-LR-001",
    name: "Canyon Cloud Sectional",
    price: 1299,
    badge: "Store favorite",
    categories: ["Living Room", "Sectionals"],
    imageUrl:
      "https://images.unsplash.com/photo-1550254478-ead40cc54513?auto=format&fit=crop&w=1100&q=82",
    featured: true,
  },
  {
    id: "p2",
    sku: "AF-DN-001",
    name: "Magnolia Dining Set",
    price: 899,
    badge: "7-piece set",
    categories: ["Dining", "Dining Sets", "Dining Tables"],
    imageUrl:
      "https://images.unsplash.com/photo-1604578762246-41134e37f9cc?auto=format&fit=crop&w=1100&q=82",
    featured: true,
  },
  {
    id: "p3",
    sku: "AF-BR-001",
    name: "Solana Upholstered Bed",
    price: 749,
    categories: ["Bedroom", "Bedroom Sets", "Beds", "King", "Queen"],
    sizes: ["King", "Queen"],
    imageUrl:
      "https://images.unsplash.com/photo-1617104678098-de229db51175?auto=format&fit=crop&w=1100&q=82",
    featured: true,
  },
  {
    id: "p4",
    sku: "AF-LR-002",
    name: "Central Avenue Recliner",
    price: 599,
    badge: "Power reclining",
    categories: ["Living Room", "Recliners", "Chairs"],
    imageUrl:
      "https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=crop&w=1100&q=82",
    featured: true,
  },
];

function list(value: string[] | string | undefined) {
  if (Array.isArray(value)) return value.map((item) => item.trim()).filter(Boolean);
  return (value ?? "")
    .split(/[|,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function moneyToCents(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const number = typeof value === "number" ? value : Number(String(value).replace(/[$,]/g, ""));
  if (!Number.isFinite(number) || number < 0) return null;
  return Math.round(number * 100);
}

function normalize(input: ProductInput) {
  const name = input.name?.trim() ?? "";
  const priceCents = moneyToCents(input.price);
  if (!name) throw new Error("Every product needs a name.");
  if (priceCents === null) throw new Error(`${name} needs a valid price.`);
  const id = input.id?.trim() || crypto.randomUUID();
  const slug = slugify(input.slug?.trim() || `${name}-${input.sku || id.slice(0, 8)}`);
  return {
    id,
    slug,
    sku: input.sku?.trim() ?? "",
    name,
    description: input.description?.trim() ?? "",
    priceCents,
    compareAtPriceCents: moneyToCents(input.compareAtPrice),
    categoriesJson: JSON.stringify(list(input.categories)),
    sizesJson: JSON.stringify(list(input.sizes)),
    colorsJson: JSON.stringify([...new Set(list(input.colors))]),
    imageUrl: input.imageUrl?.trim() ?? "",
    badge: input.badge?.trim() ?? "",
    vendor: input.vendor?.trim() ?? "",
    status: input.status === "draft" ? "draft" : "active",
    featured:
      input.featured === true || input.featured === 1 || input.featured === "true" || input.featured === "1",
    updatedAt: new Date(),
  };
}

function safeArray(value: string | undefined) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function present(row: typeof products.$inferSelect | StoredProduct | LocalStoredProduct) {
  return {
    id: row.id,
    slug: row.slug,
    sku: row.sku,
    name: row.name,
    description: row.description,
    price: row.priceCents / 100,
    compareAtPrice: row.compareAtPriceCents === null ? null : row.compareAtPriceCents / 100,
    categories: safeArray(row.categoriesJson),
    sizes: safeArray(row.sizesJson),
    colors: safeArray(row.colorsJson),
    image: row.imageUrl,
    imageUrl: row.imageUrl,
    badge: row.badge,
    vendor: row.vendor,
    status: row.status,
    featured: row.featured,
    updatedAt: row.updatedAt,
  };
}

function isSelfHosted() {
  return process.env.SELF_HOSTED === "true";
}

function toLocalStoredProduct(row: StoredProduct): LocalStoredProduct {
  return {
    ...row,
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function localCatalogPath() {
  const path = await import("node:path");
  return path.resolve(process.env.CATALOG_FILE?.trim() || ".data/products.json");
}

let localWriteQueue: Promise<void> = Promise.resolve();

async function writeLocalCatalog(rows: LocalStoredProduct[]) {
  const pending = localWriteQueue.then(async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const file = await localCatalogPath();
    const temporaryFile = `${file}.tmp`;
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(temporaryFile, `${JSON.stringify(rows, null, 2)}\n`, "utf8");
    await fs.rename(temporaryFile, file);
  });
  localWriteQueue = pending.catch(() => undefined);
  await pending;
}

async function readLocalCatalog(): Promise<LocalStoredProduct[]> {
  const fs = await import("node:fs/promises");
  const file = await localCatalogPath();
  try {
    const parsed = JSON.parse(await fs.readFile(file, "utf8"));
    if (!Array.isArray(parsed)) throw new Error("The local product catalog is not a JSON list.");
    return parsed as LocalStoredProduct[];
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") throw error;
    const seeded = sampleProducts.map(normalize).map(toLocalStoredProduct);
    await writeLocalCatalog(seeded);
    return seeded;
  }
}

function adminEmailSet() {
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

async function seedIfEmpty() {
  const db = await getDb();
  const existing = await db.select({ id: products.id }).from(products).limit(1);
  if (existing.length) return;
  await db.insert(products).values(sampleProducts.map(normalize)).onConflictDoNothing();
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error";
  const cause = error instanceof Error && error.cause instanceof Error ? error.cause.message : "";
  const missingTable = `${message}\n${cause}`.includes("no such table");
  return Response.json(
    { error: missingTable ? "The product database is still being prepared. Please try again shortly." : message },
    { status: 500 },
  );
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const adminView = url.searchParams.get("admin") === "1";
    if (adminView && !isAdmin(request)) {
      return Response.json({ error: "Admin sign-in required." }, { status: 403 });
    }
    if (isSelfHosted()) {
      const rows = (await readLocalCatalog())
        .filter((row) => adminView || row.status === "active")
        .sort((left, right) => left.name.localeCompare(right.name));
      return Response.json({ products: rows.map(present) });
    }
    await seedIfEmpty();
    const db = await getDb();
    const rows = adminView
      ? await db.select().from(products).orderBy(asc(products.name))
      : await db.select().from(products).where(eq(products.status, "active")).orderBy(asc(products.name));
    return Response.json({ products: rows.map(present) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  if (!isAdmin(request)) return Response.json({ error: "Admin access required." }, { status: 403 });
  try {
    const body = (await request.json()) as { product?: ProductInput; products?: ProductInput[] };
    const inputs = body.products ?? (body.product ? [body.product] : []);
    if (!inputs.length) return Response.json({ error: "No products were provided." }, { status: 400 });
    if (inputs.length > 1000) return Response.json({ error: "Import up to 1,000 products at a time." }, { status: 400 });
    if (isSelfHosted()) {
      const current = await readLocalCatalog();
      const values = inputs.map((input) => {
        const existing = input.id?.trim()
          ? current.find((row) => row.id === input.id?.trim())
          : current.find((row) => input.sku?.trim() && row.sku === input.sku.trim());
        return toLocalStoredProduct(
          normalize(existing ? { ...input, colors: input.colors ?? safeArray(existing.colorsJson), id: existing.id, slug: existing.slug } : input),
        );
      });
      const next = [...current];
      for (const value of values) {
        const index = next.findIndex((row) => row.id === value.id);
        if (index >= 0) next[index] = value;
        else next.push(value);
      }
      await writeLocalCatalog(next);
      return Response.json({ products: values.map(present) }, { status: 201 });
    }

    const db = await getDb();
    const values = [];
    for (const input of inputs) {
      let resolved = input;
      if (input.id?.trim() || input.sku?.trim()) {
        const [existing] = await db
          .select({ id: products.id, slug: products.slug, colorsJson: products.colorsJson })
          .from(products)
          .where(input.id?.trim() ? eq(products.id, input.id.trim()) : eq(products.sku, input.sku!.trim()))
          .limit(1);
        if (existing) resolved = { ...input, colors: input.colors ?? safeArray(existing.colorsJson), id: existing.id, slug: existing.slug };
      }
      values.push(normalize(resolved));
    }
    for (const value of values) {
      const { id, ...updates } = value;
      await db.insert(products).values(value).onConflictDoUpdate({
        target: products.id,
        set: updates,
      });
    }
    return Response.json({ products: values.map((value) => ({ ...value, price: value.priceCents / 100 })) }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  if (!isAdmin(request)) return Response.json({ error: "Admin access required." }, { status: 403 });
  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id) return Response.json({ error: "Product id is required." }, { status: 400 });
  try {
    if (isSelfHosted()) {
      const current = await readLocalCatalog();
      await writeLocalCatalog(current.filter((row) => row.id !== id));
      return Response.json({ deleted: id });
    }
    const db = await getDb();
    await db.delete(products).where(eq(products.id, id));
    return Response.json({ deleted: id });
  } catch (error) {
    return errorResponse(error);
  }
}
