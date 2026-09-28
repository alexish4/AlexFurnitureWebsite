export type ShopProduct = {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  price: number;
  image: string;
  categories: string[];
  sizes?: string[];
  colors?: string[];
  badge?: string;
};

export type CartLine = { key: string; product: ShopProduct; color: string; size: string; quantity: number };

export function options(values?: string[]) {
  return [...new Set((values || []).map((value) => value.trim()).filter(Boolean))];
}

export function addCartLine(lines: CartLine[], product: ShopProduct, color: string, size: string, quantity: number): CartLine[] {
  const colors = options(product.colors);
  const sizes = options(product.sizes);
  if ((colors.length ? !colors.includes(color) : color !== "") || (sizes.length ? !sizes.includes(size) : size !== "")) {
    throw new Error("Choose an available color and size.");
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) throw new Error("Choose a quantity from 1 to 99.");
  const key = JSON.stringify([product.id, color, size]);
  const existing = lines.find((line) => line.key === key);
  if (existing && existing.quantity + quantity > 99) throw new Error("You can add up to 99 of this selection.");
  return existing
    ? lines.map((line) => line.key === key ? { ...line, quantity: line.quantity + quantity } : line)
    : [...lines, { key, product, color, size, quantity }];
}
