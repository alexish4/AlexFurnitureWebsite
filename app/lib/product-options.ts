export type ProductPhoto = { url: string; color: string };
export type PriceOptions = { images?: ProductPhoto[]; sizePrices?: Record<string, number>; sizeOriginalPrices?: Record<string, number> };
export type SetPiece = {
  localId: string; type: string; name: string; description: string; sku: string;
  price: number; compareAtPrice: number | null; imageUrl: string; sizes: string[];
  optional: boolean; configuration: PriceOptions;
};
export type ProductConfiguration = PriceOptions & { setType?: string; pieces?: SetPiece[] };

export const money = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD" });
export const cents = (value: number) => Math.round(value * 100);

export function selectionPrice(product: { price: number; compareAtPrice?: number | null; configuration?: ProductConfiguration }, size: string, extras: string[] = []) {
  const config = product.configuration || {};
  const base = config.sizePrices?.[size] ?? product.price;
  // An overridden size price needs its own original price; do not invent a discount.
  const original = size && config.sizePrices?.[size] !== undefined
    ? config.sizeOriginalPrices?.[size] ?? null : product.compareAtPrice ?? null;
  const additions = (config.pieces || []).filter((piece) => piece.optional && extras.includes(piece.localId));
  const extraCents = additions.reduce((sum, piece) => sum + cents(piece.price), 0);
  const total = (cents(base) + extraCents) / 100;
  const originalTotal = original !== null ? (cents(original) + additions.reduce((sum, piece) => sum + cents(Math.max(piece.price, piece.compareAtPrice ?? piece.price)), 0)) / 100 : null;
  return { total, original: originalTotal !== null && originalTotal > total ? originalTotal : null };
}

export function listingPrice(product: { price: number; compareAtPrice?: number | null; sizes?: string[]; configuration?: ProductConfiguration }) {
  const sizes = product.sizes || [];
  const values = sizes.length ? sizes.map((size) => ({ size, ...selectionPrice(product, size) })) : [{ size: "", ...selectionPrice(product, "") }];
  values.sort((a,b) => a.total - b.total);
  return { ...values[0], from: new Set(values.map((value) => value.total)).size > 1 };
}

// Validate at the API boundary, including imports. All configuration prices are retail USD.
export function normalizeConfiguration(raw: unknown): ProductConfiguration {
  if (raw === undefined || raw === null) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) throw new Error("Product options must be an object.");
  const value = raw as ProductConfiguration;
  function price(input: unknown): number {
    if (typeof input !== "number" || !Number.isFinite(input) || input < 0 || input > 10000000) throw new Error("Option prices must be valid non-negative amounts.");
    return cents(input) / 100;
  }
  function prices(input?: Record<string, number>) {
    if (input === undefined) return {};
    if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).length > 30) throw new Error("Invalid size prices.");
    return Object.fromEntries(Object.entries(input).map(([key, amount]) => [key.slice(0,80), price(amount)]));
  }
  function text(input: unknown, limit = 3000) { return typeof input === "string" ? input.trim().slice(0,limit) : ""; }
  function details(input: PriceOptions): PriceOptions {
    if (input.images !== undefined && (!Array.isArray(input.images) || input.images.length > 30)) throw new Error("Use up to 30 photos per product.");
    const images = (input.images || []).filter((photo) => photo && text(photo.url)).map((photo) => {
      const url = text(photo.url, 2000);
      if (!/^https?:\/\//i.test(url)) throw new Error("Photo links must begin with https:// or http://.");
      return { url, color: text(photo.color,80) };
    });
    return { images, sizePrices: prices(input.sizePrices), sizeOriginalPrices: prices(input.sizeOriginalPrices) };
  }
  if (value.pieces !== undefined && (!Array.isArray(value.pieces) || value.pieces.length > 30)) throw new Error("Use up to 30 set pieces.");
  const pieces = (value.pieces || []).map((piece) => {
    if (!piece || !text(piece.localId,100) || !text(piece.type,80)) throw new Error("Every set piece needs an ID and type.");
    if (!Array.isArray(piece.sizes) || piece.sizes.some((size) => typeof size !== "string")) throw new Error("Invalid piece sizes.");
    if (piece.optional && piece.sizes.length) throw new Error("Optional extras must be unsized pieces, such as a chest or chair.");
    return { localId: text(piece.localId,100), type: text(piece.type,80), name: text(piece.name,200), description: text(piece.description), sku: text(piece.sku,100), price: price(piece.price), compareAtPrice: piece.compareAtPrice == null ? null : price(piece.compareAtPrice), imageUrl: text(piece.imageUrl,2000), sizes: piece.sizes.slice(0,30), optional: piece.optional === true, configuration: details(piece.configuration || {}) };
  });
  if (new Set(pieces.map((piece) => piece.localId)).size !== pieces.length) throw new Error("Set piece IDs must be unique.");
  return { ...details(value), setType: text(value.setType,80), pieces };
}

export function readConfiguration(value?: string): ProductConfiguration {
  if (!value) return {};
  return normalizeConfiguration(JSON.parse(value));
}
