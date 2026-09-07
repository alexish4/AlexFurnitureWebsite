"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

type Product = {
  id: string;
  sku: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  categories: string[];
  sizes: string[];
  imageUrl: string;
  badge: string;
  vendor: string;
  status: "active" | "draft";
  featured: boolean;
};

type ProductChoice = { group: string; item: string };

type SetDefinition = {
  id: string;
  label: string;
  group: string;
  category: string;
  pieceOptions: string[];
};

type PieceDraft = {
  localId: string;
  type: string;
  name: string;
  sku: string;
  price: number;
  compareAtPrice: number | null;
  imageUrl: string;
  sizes: string[];
};

const blank: Product = {
  id: "",
  sku: "",
  name: "",
  description: "",
  price: 0,
  compareAtPrice: null,
  categories: [],
  sizes: [],
  imageUrl: "",
  badge: "",
  vendor: "",
  status: "active",
  featured: false,
};

const taxonomy = [
  {
    label: "Bedroom",
    items: [
      "Bedroom Sets", "Armoires", "Beds", "Benches", "Chests", "Dresser",
      "Headboards", "Mattresses", "Mirrors", "Nightstands", "Stools", "Trundles", "Vanities",
    ],
  },
  {
    label: "Dining",
    items: [
      "Dining Room Sets", "Dining Tables", "Bars", "Benches", "Cabinets",
      "Chairs", "Sideboards", "Stools",
    ],
  },
  {
    label: "Living Rooms",
    items: [
      "Living Room Sets", "Wall Units", "Sectionals", "Sleeper Sofas", "Bookcases",
      "Sofas", "Cabinets", "Chairs", "Coffee Table", "Sofa Table", "End Table",
      "Loveseats", "Ottomans",
    ],
  },
  {
    label: "Kids & Teens",
    items: ["Bedroom Sets", "Beds", "Daybeds", "Chests", "Dresser", "Headboards", "Nightstands"],
  },
  {
    label: "Entertainment",
    items: ["Entertainment Centers", "Desks", "Gaming", "Hutches", "Wall Pieces"],
  },
  {
    label: "Outdoor",
    items: ["Outdoor Sets", "Patio Bar", "Tables", "Sectionals", "Ottomans", "Sofas"],
  },
];

const setDefinitions: SetDefinition[] = [
  {
    id: "bedroom-set",
    label: "Bedroom set",
    group: "Bedroom",
    category: "Bedroom Sets",
    pieceOptions: ["Beds", "Dresser", "Mirrors", "Nightstands", "Chests", "Headboards", "Armoires", "Benches", "Mattresses", "Stools", "Trundles", "Vanities"],
  },
  {
    id: "kids-bedroom-set",
    label: "Kids & teens bedroom set",
    group: "Kids & Teens",
    category: "Bedroom Sets",
    pieceOptions: ["Beds", "Daybeds", "Dresser", "Nightstands", "Chests", "Headboards"],
  },
  {
    id: "dining-set",
    label: "Dining table set",
    group: "Dining",
    category: "Dining Room Sets",
    pieceOptions: ["Dining Tables", "Chairs", "Benches", "Stools", "Bars", "Cabinets", "Sideboards"],
  },
  {
    id: "living-room-set",
    label: "Living room set",
    group: "Living Rooms",
    category: "Living Room Sets",
    pieceOptions: ["Sofas", "Loveseats", "Chairs", "Ottomans", "Sectionals", "Sleeper Sofas", "Coffee Table", "End Table", "Sofa Table", "Cabinets", "Wall Units", "Bookcases"],
  },
  {
    id: "outdoor-set",
    label: "Outdoor set",
    group: "Outdoor",
    category: "Outdoor Sets",
    pieceOptions: ["Tables", "Sofas", "Sectionals", "Ottomans", "Patio Bar"],
  },
  {
    id: "entertainment-center",
    label: "Entertainment center",
    group: "Entertainment",
    category: "Entertainment Centers",
    pieceOptions: ["Entertainment Centers", "Hutches", "Wall Pieces", "Desks", "Gaming"],
  },
];

const bedSizes = ["Twin", "Twin XL", "Full", "Queen", "King", "California King"];

const guidedStyles = `
  .guidedBlock { border: 2px solid #ddd4c7; border-radius: 18px; padding: 22px; margin: 0 0 22px; }
  .guidedBlock legend { padding: 0 10px; font-size: 1.12rem; font-weight: 800; }
  .guidedHint { display: block; margin: -4px 0 18px; color: #655d53; font-size: .95rem; }
  .modeChoices, .setChoices { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
  .modeChoice, .setChoice, .typeChoice, .sizeChoice { border: 2px solid #d8d0c4; background: #fff; color: #211f1b; border-radius: 14px; cursor: pointer; font: inherit; font-weight: 800; text-align: left; transition: border-color .15s ease, background .15s ease, transform .15s ease; }
  .modeChoice { min-height: 94px; padding: 18px 20px; font-size: 1.08rem; }
  .modeChoice small { display: block; margin-top: 7px; color: #6f675e; font-size: .86rem; font-weight: 500; line-height: 1.4; }
  .setChoice { min-height: 70px; padding: 16px; font-size: 1rem; }
  .typeChoice { min-height: 58px; padding: 13px 15px; font-size: .96rem; }
  .sizeChoice { min-height: 50px; padding: 11px 14px; text-align: center; }
  .modeChoice:hover, .setChoice:hover, .typeChoice:hover, .sizeChoice:hover { border-color: #8d6748; transform: translateY(-1px); }
  .modeChoice[aria-pressed="true"], .setChoice[aria-pressed="true"], .typeChoice[aria-pressed="true"], .sizeChoice[aria-pressed="true"] { border-color: #7a4d2c; background: #f5ece3; box-shadow: 0 0 0 2px rgba(122,77,44,.12); }
  .typeGroups { display: grid; gap: 16px; }
  .typeGroup { border-top: 1px solid #e2ddd5; padding-top: 16px; }
  .typeGroup:first-child { border-top: 0; padding-top: 0; }
  .typeGroup h3 { margin: 0 0 10px; font-size: 1rem; }
  .typeChoices, .sizeChoices { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
  .automaticCategory { display: flex; align-items: center; gap: 10px; margin: 0 0 22px; padding: 14px 16px; border-radius: 12px; background: #edf5ed; color: #254529; font-weight: 750; }
  .automaticCategory span { display: inline-grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; background: #2d6a36; color: white; flex: 0 0 auto; }
  .setBuilder { margin-top: 24px; border-top: 2px solid #ded6ca; padding-top: 24px; }
  .setBuilderHeader { display: flex; justify-content: space-between; align-items: start; gap: 18px; margin-bottom: 14px; }
  .setBuilderHeader h3 { margin: 3px 0 5px; font-size: 1.35rem; }
  .setBuilderHeader p { margin: 0; color: #655d53; }
  .addPieceButton { min-height: 52px; padding: 12px 18px; border: 0; border-radius: 12px; background: #27231f; color: white; font: inherit; font-weight: 800; cursor: pointer; white-space: nowrap; }
  .pieceCard { margin-top: 14px; padding: 18px; border: 1px solid #d8d0c4; border-radius: 16px; background: #faf8f5; }
  .pieceCardHeader { display: flex; align-items: center; justify-content: space-between; gap: 15px; margin-bottom: 14px; }
  .pieceCardHeader strong { font-size: 1.08rem; }
  .removePiece { border: 0; background: transparent; color: #9a2f27; font: inherit; font-weight: 750; cursor: pointer; }
  .saveSummary { display: block; margin: 12px 0 0; text-align: center; color: #655d53; font-size: .9rem; }
  @media (max-width: 760px) {
    .modeChoices, .setChoices, .typeChoices { grid-template-columns: 1fr; }
    .sizeChoices { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .setBuilderHeader { flex-direction: column; }
    .addPieceButton { width: 100%; }
  }
`;

function categoryKey(group: string, item: string) {
  return `${group} / ${item}`;
}

function categoriesFor(choice: ProductChoice) {
  return [choice.group, categoryKey(choice.group, choice.item)];
}

function needsSize(item: string) {
  return ["Beds", "Daybeds", "Headboards", "Mattresses", "Trundles"].includes(item);
}

function labelForCategory(category: string) {
  return category.split(" / ").at(-1) ?? category;
}

function newPiece(type: string): PieceDraft {
  return {
    localId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type,
    name: "",
    sku: "",
    price: 0,
    compareAtPrice: null,
    imageUrl: "",
    sizes: [],
  };
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') { cell += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(cell); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell); if (row.some(Boolean)) rows.push(row); row = []; cell = "";
    } else cell += char;
  }
  row.push(cell); if (row.some(Boolean)) rows.push(row);
  if (rows.length < 2) return [];
  const headers = rows[0].map((header) => header.trim().toLowerCase().replace(/\s+/g, "_"));
  return rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() ?? ""])) as Record<string, string>);
}

function choiceFromCsv(roomValue: string, typeValue: string) {
  const roomAlias = roomValue.trim().toLowerCase() === "living room" ? "Living Rooms" : roomValue.trim();
  const group = taxonomy.find((candidate) => candidate.label.toLowerCase() === roomAlias.toLowerCase());
  const item = group?.items.find((candidate) => candidate.toLowerCase() === typeValue.trim().toLowerCase());
  return group && item ? { group: group.label, item } : null;
}

function choiceFromCategories(categories: string[]): ProductChoice | null {
  const path = categories.find((category) => category.includes(" / "));
  if (path) {
    const [group, item] = path.split(" / ");
    if (group && item) return { group, item };
  }
  for (const group of taxonomy) {
    const hasGroup = categories.includes(group.label) || (group.label === "Living Rooms" && categories.includes("Living Room"));
    const item = group.items.find((candidate) => categories.includes(candidate));
    if (hasGroup && item) return { group: group.label, item };
  }
  return null;
}

export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<Product>({ ...blank });
  const [mode, setMode] = useState<"single" | "set" | null>(null);
  const [choice, setChoice] = useState<ProductChoice | null>(null);
  const [setId, setSetId] = useState("");
  const [pieces, setPieces] = useState<PieceDraft[]>([]);
  const [status, setStatus] = useState("Loading your catalog…");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [authRequired, setAuthRequired] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const selectedSet = setDefinitions.find((definition) => definition.id === setId) ?? null;
  const showDetails = !!form.id || (mode === "single" && !!choice) || (mode === "set" && !!selectedSet);

  function protectedHeaders(password = adminPassword): Record<string, string> {
    return password ? { "X-Admin-Password": password } : {};
  }

  async function loadProducts(password = adminPassword) {
    const response = await fetch("/api/products?admin=1", {
      cache: "no-store",
      headers: protectedHeaders(password),
    });
    const data = await response.json();
    if (response.status === 403) {
      setAuthRequired(true);
      setStatus("Enter the catalog password to continue.");
      return false;
    }
    if (!response.ok) throw new Error(data.error ?? "Could not load products.");
    setAuthRequired(false);
    setProducts(data.products);
    setStatus(`${data.products.length} products in your catalog`);
    return true;
  }

  useEffect(() => {
    const savedPassword = window.sessionStorage.getItem("alex-furniture-admin-password") ?? "";
    // Loading remote catalog state is the purpose of this one-time effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProducts(savedPassword)
      .then((signedIn) => signedIn && setAdminPassword(savedPassword))
      .catch((error) => setStatus(error.message));
    // The initial catalog request intentionally runs once with the tab's saved password.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setStatus("Checking password…");
    try {
      const signedIn = await loadProducts(loginPassword);
      if (!signedIn) return;
      window.sessionStorage.setItem("alex-furniture-admin-password", loginPassword);
      setAdminPassword(loginPassword);
      setLoginPassword("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  function signOut() {
    window.sessionStorage.removeItem("alex-furniture-admin-password");
    setAdminPassword("");
    setProducts([]);
    setAuthRequired(true);
    setStatus("Signed out.");
  }

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return products.filter((product) => !term || `${product.name} ${product.sku} ${product.categories.join(" ")}`.toLowerCase().includes(term));
  }, [products, query]);

  function update<K extends keyof Product>(key: K, value: Product[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetEditor() {
    setForm({ ...blank, categories: [], sizes: [] });
    setMode(null);
    setChoice(null);
    setSetId("");
    setPieces([]);
  }

  function selectMode(nextMode: "single" | "set") {
    setMode(nextMode);
    setChoice(null);
    setSetId("");
    setPieces([]);
    update("categories", []);
    update("sizes", []);
  }

  function selectSingle(nextChoice: ProductChoice) {
    setChoice(nextChoice);
    update("categories", categoriesFor(nextChoice));
    if (!needsSize(nextChoice.item)) update("sizes", []);
  }

  function selectSet(definition: SetDefinition) {
    setSetId(definition.id);
    setPieces([]);
    update("categories", categoriesFor({ group: definition.group, item: definition.category }));
    update("sizes", []);
  }

  function toggleSize(size: string) {
    update("sizes", form.sizes.includes(size)
      ? form.sizes.filter((item) => item !== size)
      : [...form.sizes, size]);
  }

  function updatePiece<K extends keyof PieceDraft>(localId: string, key: K, value: PieceDraft[K]) {
    setPieces((current) => current.map((piece) => piece.localId === localId ? { ...piece, [key]: value } : piece));
  }

  function changePieceType(piece: PieceDraft, type: string) {
    setPieces((current) => current.map((candidate) => candidate.localId === piece.localId
      ? { ...candidate, type, sizes: needsSize(type) ? candidate.sizes : [] }
      : candidate));
  }

  function togglePieceSize(piece: PieceDraft, size: string) {
    updatePiece(piece.localId, "sizes", piece.sizes.includes(size)
      ? piece.sizes.filter((item) => item !== size)
      : [...piece.sizes, size]);
  }

  function beginEdit(product: Product) {
    setForm(product);
    setMode("single");
    setChoice(choiceFromCategories(product.categories));
    setSetId("");
    setPieces([]);
    window.scrollTo({ top: 190, behavior: "smooth" });
  }

  async function saveProduct(event: React.FormEvent) {
    event.preventDefault();

    if (mode === "single" && choice && needsSize(choice.item) && !form.sizes.length) {
      setStatus("Choose at least one size for this bed item.");
      return;
    }
    if (!form.id && mode === "set") {
      if (!selectedSet) { setStatus("Choose what type of set you are adding."); return; }
      if (!pieces.length) { setStatus("Add at least one individual piece to the set."); return; }
      const incompletePiece = pieces.find((piece) => !piece.name.trim() || piece.price <= 0);
      if (incompletePiece) { setStatus("Every set piece needs a name and price."); return; }
      const unsizedBed = pieces.find((piece) => needsSize(piece.type) && !piece.sizes.length);
      if (unsizedBed) { setStatus(`Choose a size for ${unsizedBed.name || "each bed item"}.`); return; }
    }

    setBusy(true);
    setStatus(mode === "set" && !form.id ? "Creating the set and its individual pieces…" : "Saving product…");
    try {
      let body: { product: Product } | { products: Product[] };
      if (!form.id && mode === "set" && selectedSet) {
        const setChoice = { group: selectedSet.group, item: selectedSet.category };
        const setSizes = Array.from(new Set(pieces.flatMap((piece) => piece.sizes)));
        const setProduct: Product = { ...form, categories: categoriesFor(setChoice), sizes: setSizes };
        const individualProducts: Product[] = pieces.map((piece) => ({
          id: "",
          sku: piece.sku,
          name: piece.name,
          description: `Available individually from the ${form.name}.`,
          price: piece.price,
          compareAtPrice: piece.compareAtPrice,
          categories: categoriesFor({ group: selectedSet.group, item: piece.type }),
          sizes: piece.sizes,
          imageUrl: piece.imageUrl || form.imageUrl,
          badge: "",
          vendor: form.vendor,
          status: form.status,
          featured: false,
        }));
        body = { products: [setProduct, ...individualProducts] };
      } else {
        const categories = choice ? categoriesFor(choice) : form.categories;
        body = { product: { ...form, categories } };
      }

      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...protectedHeaders() },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save product.");
      const createdCount = "products" in body ? body.products.length : 1;
      resetEditor();
      await loadProducts();
      setStatus(createdCount > 1 ? `Set saved with ${createdCount - 1} individual products.` : "Product saved successfully.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save product.");
    } finally {
      setBusy(false);
    }
  }

  async function removeProduct(product: Product) {
    if (!window.confirm(`Delete ${product.name}?`)) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/products?id=${encodeURIComponent(product.id)}`, { method: "DELETE", headers: protectedHeaders() });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not delete product.");
      await loadProducts();
      setStatus("Product deleted.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not delete product.");
    } finally {
      setBusy(false);
    }
  }

  async function importCsv(file: File) {
    setBusy(true);
    setStatus("Reading spreadsheet…");
    try {
      const rows = parseCsv(await file.text());
      const imported = rows.map((row) => {
        const automaticChoice = choiceFromCsv(row.room ?? "", row.product_type ?? "");
        return {
          id: row.id || undefined,
          sku: row.sku,
          name: row.name,
          description: row.description,
          price: row.price,
          compareAtPrice: row.compare_at_price || null,
          categories: automaticChoice ? categoriesFor(automaticChoice) : row.categories?.split("|").filter(Boolean) ?? [],
          sizes: row.sizes?.split("|").filter(Boolean) ?? [],
          imageUrl: row.image_url,
          badge: row.badge,
          vendor: row.vendor,
          status: row.status === "draft" ? "draft" : "active",
          featured: ["true", "1", "yes"].includes(row.featured?.toLowerCase()),
        };
      });
      if (!imported.length) throw new Error("No product rows were found in that CSV.");
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...protectedHeaders() },
        body: JSON.stringify({ products: imported }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not import CSV.");
      await loadProducts();
      setStatus(`${imported.length} products imported successfully.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not import CSV.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function downloadTemplate() {
    const csv = 'id,sku,name,description,price,compare_at_price,room,product_type,sizes,image_url,badge,vendor,status,featured\n,AF-LR-100,Example Sofa,"Comfortable living room sofa",899,1099,Living Rooms,Sofas,,https://example.com/photo.jpg,New,Vendor Name,active,true\n';
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "alex-furniture-product-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  const selectedLabel = choice
    ? `${choice.group} → ${choice.item}`
    : selectedSet
      ? `${selectedSet.group} → ${selectedSet.category}`
      : form.categories.map(labelForCategory).join(" → ");

  return (
    <main className="adminPage">
      <style>{guidedStyles}</style>
      <header className="adminHeader">
        <Link className="brand" href="/"><span className="brandMark">AF</span><span><strong>Alex Furniture</strong><small>Catalog manager</small></span></Link>
        <div>{adminPassword && <button type="button" onClick={signOut}>Sign out</button>} <Link href="/">View storefront →</Link></div>
      </header>
      <section className="adminIntro">
        <p>Store management</p><h1>Product catalog</h1>
        <span>Choose what you are adding. The correct store categories are assigned automatically.</span>
      </section>
      <div className="adminStatus" role="status"><span className={busy ? "statusDot busy" : "statusDot"} />{status}</div>
      {authRequired ? (
        <section className="adminGrid">
          <form className="productForm" onSubmit={signIn}>
            <div className="adminSectionTitle"><div><p>Private manager</p><h2>Catalog sign-in</h2></div></div>
            <label>Catalog password<input required type="password" autoComplete="current-password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} /></label>
            <button className="primaryAdminButton" disabled={busy}>Sign in</button>
          </form>
        </section>
      ) : (
        <section className="adminGrid">
          <form className="productForm" onSubmit={saveProduct}>
            <div className="adminSectionTitle">
              <div><p>{form.id ? "Editing product" : "New product"}</p><h2>{form.id ? form.name : "Add an item"}</h2></div>
              {(form.id || mode) && <button type="button" onClick={resetEditor}>Cancel</button>}
            </div>

            {!form.id && (
              <fieldset className="guidedBlock">
                <legend>1. What are you adding?</legend>
                <span className="guidedHint">Choose one large button to continue.</span>
                <div className="modeChoices">
                  <button className="modeChoice" type="button" aria-pressed={mode === "single"} onClick={() => selectMode("single")}>
                    One individual item
                    <small>A sofa, bed, table, dresser, chair, or another single piece</small>
                  </button>
                  <button className="modeChoice" type="button" aria-pressed={mode === "set"} onClick={() => selectMode("set")}>
                    A furniture set
                    <small>Create the complete set and every individual piece in one step</small>
                  </button>
                </div>
              </fieldset>
            )}

            {!form.id && mode === "single" && (
              <fieldset className="guidedBlock">
                <legend>2. What type of item is it?</legend>
                <span className="guidedHint">Items are grouped by room, so an outdoor table and living room table cannot be mixed up.</span>
                <div className="typeGroups">
                  {taxonomy.map((group) => {
                    const singleItems = group.items.filter((item) => !item.endsWith("Sets"));
                    return (
                      <section className="typeGroup" key={group.label}>
                        <h3>{group.label}</h3>
                        <div className="typeChoices">
                          {singleItems.map((item) => {
                            const active = choice?.group === group.label && choice.item === item;
                            return <button className="typeChoice" type="button" aria-pressed={active} key={item} onClick={() => selectSingle({ group: group.label, item })}>{item}</button>;
                          })}
                        </div>
                      </section>
                    );
                  })}
                </div>
              </fieldset>
            )}

            {!form.id && mode === "set" && (
              <fieldset className="guidedBlock">
                <legend>2. What type of set is it?</legend>
                <span className="guidedHint">The manager will create the set and its individual products together.</span>
                <div className="setChoices">
                  {setDefinitions.map((definition) => (
                    <button className="setChoice" type="button" aria-pressed={setId === definition.id} key={definition.id} onClick={() => selectSet(definition)}>{definition.label}</button>
                  ))}
                </div>
              </fieldset>
            )}

            {showDetails && (
              <>
                <div className="automaticCategory"><span>✓</span>Category handled for you: {selectedLabel || "Existing product categories"}</div>
                <div className="fieldRow">
                  <label>Product name<input required value={form.name} onChange={(event) => update("name", event.target.value)} placeholder={mode === "set" ? "Solana Bedroom Set" : "Solana Upholstered Bed"} /></label>
                  <label>SKU<input value={form.sku} onChange={(event) => update("sku", event.target.value)} placeholder="AF-BR-100" /></label>
                </div>
                <label>Description<textarea value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="Materials, pieces included, colors, and other details…" /></label>
                <div className="fieldRow">
                  <label>Price ($)<input required min="0" step="0.01" type="number" value={form.price || ""} onChange={(event) => update("price", Number(event.target.value))} placeholder="1299" /></label>
                  <label>Original price, optional ($)<input min="0" step="0.01" type="number" value={form.compareAtPrice ?? ""} onChange={(event) => update("compareAtPrice", event.target.value ? Number(event.target.value) : null)} placeholder="1499" /></label>
                </div>
                <label>Product photo URL<input value={form.imageUrl} onChange={(event) => update("imageUrl", event.target.value)} placeholder="https://manufacturer.com/product-photo.jpg" /></label>
                {form.imageUrl && <img className="imagePreview" src={form.imageUrl} alt="Product preview" />}
                <div className="fieldRow">
                  <label>Vendor / manufacturer<input value={form.vendor} onChange={(event) => update("vendor", event.target.value)} placeholder="Ashley, Coaster, etc." /></label>
                  <label>Badge<input value={form.badge} onChange={(event) => update("badge", event.target.value)} placeholder="New · Sale · Store favorite" /></label>
                </div>

                {mode === "single" && choice && needsSize(choice.item) ? (
                  <fieldset className="guidedBlock">
                    <legend>Choose every available size</legend>
                    <span className="guidedHint">A bed item cannot be saved until at least one size is selected.</span>
                    <div className="sizeChoices">
                      {bedSizes.map((size) => <button className="sizeChoice" type="button" aria-pressed={form.sizes.includes(size)} key={size} onClick={() => toggleSize(size)}>{size}</button>)}
                    </div>
                  </fieldset>
                ) : (
                  <label>Sizes, optional<input value={form.sizes.join(" | ")} onChange={(event) => update("sizes", event.target.value.split("|").map((item) => item.trim()).filter(Boolean))} placeholder="Small | Medium | Large" /></label>
                )}

                <div className="fieldRow">
                  <label>Status<select value={form.status} onChange={(event) => update("status", event.target.value as "active" | "draft")}><option value="active">Active — visible online</option><option value="draft">Draft — hidden</option></select></label>
                  <label className="featuredCheck"><input type="checkbox" checked={form.featured} onChange={(event) => update("featured", event.target.checked)} /> Feature this product on the homepage</label>
                </div>

                {!form.id && mode === "set" && selectedSet && (
                  <section className="setBuilder">
                    <div className="setBuilderHeader">
                      <div><p>Individual products</p><h3>3. Add every piece in this set</h3><p>Each piece below will also become its own product automatically.</p></div>
                      <button className="addPieceButton" type="button" onClick={() => setPieces((current) => [...current, newPiece(selectedSet.pieceOptions[0])])}>+ Add a piece</button>
                    </div>
                    {pieces.map((piece, index) => (
                      <article className="pieceCard" key={piece.localId}>
                        <div className="pieceCardHeader"><strong>Piece {index + 1}</strong><button className="removePiece" type="button" onClick={() => setPieces((current) => current.filter((item) => item.localId !== piece.localId))}>Remove piece</button></div>
                        <label>What kind of piece is it?<select value={piece.type} onChange={(event) => changePieceType(piece, event.target.value)}>{selectedSet.pieceOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
                        <div className="fieldRow">
                          <label>Product name<input required value={piece.name} onChange={(event) => updatePiece(piece.localId, "name", event.target.value)} placeholder={`${form.name || "Set"} — ${piece.type.replace(/s$/, "")}`} /></label>
                          <label>SKU<input value={piece.sku} onChange={(event) => updatePiece(piece.localId, "sku", event.target.value)} placeholder="Individual piece SKU" /></label>
                        </div>
                        <div className="fieldRow">
                          <label>Individual price ($)<input required min="0.01" step="0.01" type="number" value={piece.price || ""} onChange={(event) => updatePiece(piece.localId, "price", Number(event.target.value))} /></label>
                          <label>Original price, optional ($)<input min="0" step="0.01" type="number" value={piece.compareAtPrice ?? ""} onChange={(event) => updatePiece(piece.localId, "compareAtPrice", event.target.value ? Number(event.target.value) : null)} /></label>
                        </div>
                        <label>Piece photo URL, optional<input value={piece.imageUrl} onChange={(event) => updatePiece(piece.localId, "imageUrl", event.target.value)} placeholder="Leave blank to use the set photo" /></label>
                        {needsSize(piece.type) && (
                          <fieldset className="guidedBlock">
                            <legend>Size for this {piece.type.toLowerCase()}</legend>
                            <div className="sizeChoices">{bedSizes.map((size) => <button className="sizeChoice" type="button" aria-pressed={piece.sizes.includes(size)} key={size} onClick={() => togglePieceSize(piece, size)}>{size}</button>)}</div>
                          </fieldset>
                        )}
                      </article>
                    ))}
                  </section>
                )}

                <button className="primaryAdminButton" disabled={busy}>
                  {form.id ? "Save changes" : mode === "set" ? `Create set + ${pieces.length} individual item${pieces.length === 1 ? "" : "s"}` : "Add product"}
                </button>
                {!form.id && mode === "set" && <span className="saveSummary">One click saves the complete set and all pieces listed above.</span>}
              </>
            )}
          </form>

          <aside className="catalogPanel">
            <div className="csvPanel"><p>Fastest for many products</p><h2>Import a CSV</h2><span>The new template uses Room and Product Type columns so categories are assigned automatically.</span><div><button onClick={downloadTemplate}>Download template</button><label className="primaryAdminButton">Choose CSV<input ref={fileRef} type="file" accept=".csv,text/csv" onChange={(event) => event.target.files?.[0] && importCsv(event.target.files[0])} /></label></div></div>
            <div className="catalogListHeader"><div><p>Current catalog</p><h2>{products.length} products</h2></div><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products" aria-label="Search products" /></div>
            <div className="catalogList">{visible.map((product) => <article key={product.id}><div className="catalogThumb">{product.imageUrl ? <img src={product.imageUrl} alt="" /> : <span>No photo</span>}</div><div><p>{product.sku || "No SKU"} · {product.status}</p><h3>{product.name}</h3><span>${product.price.toLocaleString()} · {product.categories.slice(0, 3).map(labelForCategory).join(", ")}</span><div><button onClick={() => beginEdit(product)}>Edit</button><button onClick={() => removeProduct(product)}>Delete</button></div></div></article>)}</div>
          </aside>
        </section>
      )}
    </main>
  );
}
