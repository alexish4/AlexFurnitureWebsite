import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ts from "typescript";

async function loadTypeScript(path, transform = (code) => code) {
  const source = transform(await readFile(new URL(path, import.meta.url), "utf8"));
  const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
}
const { addCartLine, options } = await loadTypeScript("../app/lib/cart.ts");
const product = { id: "bed", name: "Test Bed", price: 749, image: "", categories: ["Bedroom"], colors: ["Gray", "Beige"], sizes: ["King", "Queen"] };

test("cart separates variants, merges identical choices, validates required options and quantity", () => {
  let cart = addCartLine([], product, "Gray", "Queen", 1);
  cart = addCartLine(cart, product, "Gray", "King", 2);
  cart = addCartLine(cart, product, "Beige", "Queen", 1);
  cart = addCartLine(cart, product, "Gray", "Queen", 2);
  assert.equal(cart.length, 3);
  assert.deepEqual(cart.map((line) => line.quantity), [3, 2, 1]);
  assert.equal(cart.reduce((sum, line) => sum + line.product.price * line.quantity, 0), 4494);
  for (const [color, size, quantity] of [["", "Queen", 1], ["Gray", "", 1], ["Red", "Queen", 1], ["Gray", "Queen", 0], ["Gray", "Queen", 1.5], ["Gray", "Queen", 100]]) {
    assert.throws(() => addCartLine(cart, product, color, size, quantity));
  }
  assert.equal(addCartLine([], {...product, colors: [], sizes: []}, "", "", 1).length, 1);
  assert.deepEqual(options(["Gray", " Gray ", ""]), ["Gray"]);
});

test("Mac catalog round trips colors, keeps legacy rows readable and preserves omitted CSV colors", async () => {
  const folder = await mkdtemp(join(tmpdir(), "alex-options-"));
  const old = { ...process.env };
  process.env.SELF_HOSTED = "true";
  process.env.NODE_ENV = "production";
  process.env.ADMIN_PASSWORD = "test-password-only";
  process.env.CATALOG_FILE = join(folder, "products.json");
  // Stub only D1 dependencies: exercise the real route's local file path and auth.
  const api = await loadTypeScript("../app/api/products/route.ts", (code) => code.replace(/^import .*;\n/gm, ""));
  const post = (p, password = "test-password-only") => api.POST(new Request("http://localhost/api/products", {method:"POST", headers:{"content-type":"application/json","x-admin-password":password}, body:JSON.stringify({product:p})}));
  try {
    await writeFile(process.env.CATALOG_FILE, JSON.stringify([{id:"legacy",slug:"legacy",name:"Legacy Chair",sku:"OLD",priceCents:10000,compareAtPriceCents:null,categoriesJson:"[]",sizesJson:"[]",imageUrl:"",status:"active"}]));
    let response = await api.GET(new Request("http://localhost/api/products"));
    assert.deepEqual((await response.json()).products[0].colors, []);
    assert.equal((await post({...product,sku:"B1"}, "bad")).status,403);
    response = await post({...product,sku:"B1",description:"Upholstered bed"});
    assert.equal(response.status,201);
    const saved = (await response.json()).products[0];
    assert.deepEqual(saved.colors,["Gray","Beige"]);
    const { colors, ...withoutColors } = {...product, sku:"B1"};
    await post(withoutColors);
    response = await api.GET(new Request("http://localhost/api/products"));
    assert.deepEqual((await response.json()).products.find((p)=>p.id==="bed").colors,colors);
    await post({...product,sku:"B1",colors:[]});
    response = await api.GET(new Request("http://localhost/api/products"));
    assert.deepEqual((await response.json()).products.find((p)=>p.id==="bed").colors,[]);
  } finally { process.env = old; await rm(folder,{recursive:true,force:true}); }
});
