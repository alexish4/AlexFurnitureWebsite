import { test } from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { readFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const encode = (text) => `data:text/javascript;base64,${Buffer.from(text).toString('base64')}`;
async function compile(path, transform = (s)=>s) {
  return encode(ts.transpileModule(transform(await readFile(new URL(path,import.meta.url),'utf8')), {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);
}
const optionsUrl = await compile('../app/lib/product-options.ts');
const {selectionPrice,listingPrice,normalizeConfiguration} = await import(optionsUrl);
const cartUrl = await compile('../app/lib/cart.ts',(s)=>s.replace('"./product-options"',JSON.stringify(optionsUrl)));
const {addCartLine} = await import(cartUrl);
const chest = {localId:'chest',type:'Chests',name:'Oak Chest',description:'Five drawers',sku:'C1',price:200,compareAtPrice:250,imageUrl:'',sizes:[],optional:true,configuration:{}};
const bed = {...chest,localId:'bed',type:'Beds',name:'Oak Bed',optional:false,sizes:['Queen','King'],price:500,configuration:{sizePrices:{Queen:500,King:700}}};
const product = {id:'set',name:'Oak Bedroom',price:1000,compareAtPrice:1300,categories:['Bedroom'],image:'https://example.com/main.jpg',colors:['Gray','Brown'],sizes:['Queen','King'],configuration:{setType:'bedroom-set',sizePrices:{Queen:1000,King:1200},sizeOriginalPrices:{Queen:1300,King:1550},images:[{url:'https://example.com/brown.jpg',color:'Brown'}],pieces:[bed,chest]}};

test('size and optional piece totals use cents and valid sale comparisons',()=>{
  assert.deepEqual(selectionPrice(product,'King',['chest']),{total:1400,original:1800});
  assert.deepEqual(selectionPrice(product,'Queen'),{total:1000,original:1300});
  assert.equal(listingPrice(product).total,1000); assert.equal(listingPrice(product).from,true);
  assert.equal(selectionPrice({price:100,compareAtPrice:90},'').original,null);
  assert.equal(selectionPrice({price:100,compareAtPrice:130,configuration:{sizePrices:{King:200}}},'King').original,null);
  assert.equal(selectionPrice({price:0.1,configuration:{pieces:[{...chest,price:0.2}]}},'',['chest']).total,0.3);
});
test('cart distinguishes extras, merges identical selections and keeps selected price/photo',()=>{
  let cart = addCartLine([],product,'Brown','King',1,['chest']);
  cart = addCartLine(cart,product,'Brown','King',2,[]);
  cart = addCartLine(cart,product,'Brown','King',1,['chest']);
  assert.equal(cart.length,2); assert.equal(cart[0].quantity,2); assert.equal(cart[0].unitPrice,1400);
  assert.equal(cart[0].product.image,'https://example.com/brown.jpg'); assert.deepEqual(cart[0].extraNames,['Oak Chest']);
  assert.throws(()=>addCartLine([],product,'Brown','King',1,['missing']));
  assert.throws(()=>addCartLine([],product,'','King',1));
  assert.throws(()=>addCartLine([],product,'Brown','',1));
  assert.throws(()=>addCartLine([],product,'Brown','King',0));
  assert.equal(addCartLine([],{id:'simple',price:99,name:'Chair',image:'',categories:[]},'','',1)[0].unitPrice,99);
});
test('configuration rejects bad prices, unsafe image protocols, duplicate IDs and sized extras',()=>{
  assert.throws(()=>normalizeConfiguration({sizePrices:{King:-1}}));
  assert.throws(()=>normalizeConfiguration({images:[{url:'javascript:alert(1)',color:''}]}));
  assert.throws(()=>normalizeConfiguration({pieces:[chest,chest]}));
  assert.throws(()=>normalizeConfiguration({pieces:[{...bed,optional:true}]}));
  assert.equal(normalizeConfiguration(product.configuration).pieces[0].configuration.sizePrices.King,700);
});
test('Mac API persists configuration/description and upserts linked pieces without duplicates',async()=>{
  const folder=await mkdtemp(join(tmpdir(),'furniture-config-'));
  const old={...process.env};
  process.env.SELF_HOSTED='true'; process.env.NODE_ENV='production'; process.env.ADMIN_PASSWORD='test-password-only'; process.env.CATALOG_FILE=join(folder,'products.json');
  const apiUrl=await compile('../app/api/products/route.ts',s=>s.replace(/^import .*;\n/gm,line=>line.includes('product-options')?line.replace('"../../lib/product-options"',JSON.stringify(optionsUrl)) : ''));
  const api=await import(apiUrl);
  const post = (products) => api.POST(new Request('http://localhost/api/products',{method:'POST',headers:{'content-type':'application/json','x-admin-password':'test-password-only'},body:JSON.stringify({products})}));
  try {
    await writeFile(process.env.CATALOG_FILE,'[]');
    const child={id:bed.localId,name:bed.name,price:bed.price,description:'Solid wood headboard',sizes:bed.sizes,configuration:bed.configuration};
    assert.equal((await post([product,child])).status,201);
    assert.equal((await post([{...product,configuration:{...product.configuration,sizePrices:{Queen:1100,King:1300}}},{...child,description:'Updated description'}])).status,201);
    let rows=(await (await api.GET(new Request('http://localhost/api/products'))).json()).products;
    assert.equal(rows.length,2); assert.equal(rows.find(p=>p.id==='bed').description,'Updated description');
    assert.equal(rows.find(p=>p.id==='set').configuration.sizePrices.King,1300);
    const {configuration,...legacyImport}=product;
    assert.equal((await post([legacyImport])).status,201);
    rows=(await (await api.GET(new Request('http://localhost/api/products'))).json()).products;
    assert.equal(rows.find(p=>p.id==='set').configuration.sizePrices.King,1300);
    const invalid = await post([{...product,configuration:{sizePrices:{King:-1}}}]);
    assert.notEqual(invalid.status,201);
  } finally { process.env=old; await rm(folder,{recursive:true,force:true}); }
});
