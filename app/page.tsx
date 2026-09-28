"use client";
import CustomerChat from "./components/CustomerChat";
import ProductDetails from "./components/ProductDetails";
import { listingPrice, money } from "./lib/product-options";
import { addCartLine, type CartLine, type ShopProduct } from "./lib/cart";

import { useEffect, useMemo, useState } from "react";

type Product = ShopProduct;

const menuGroups = [
  {
    label: "Bedroom",
    items: [
      "Bedroom Sets",
      "Armoires",
      "Beds",
      "Benches",
      "Chests",
      "Dresser",
      "Headboards",
      "Mattresses",
      "Mirrors",
      "Nightstands",
      "Stools",
      "Trundles",
      "Vanities",
    ],
  },
  {
    label: "Dining",
    items: [
      "Dining Room Sets",
      "Dining Tables",
      "Bars",
      "Benches",
      "Cabinets",
      "Chairs",
      "Sideboards",
      "Stools",
    ],
  },
  {
    label: "Living Rooms",
    items: [
      "Living Room Sets",
      "Wall Units",
      "Sectionals",
      "Sleeper Sofas",
      "Bookcases",
      "Sofas",
      "Cabinets",
      "Chairs",
      "Coffee Table",
      "Sofa Table",
      "End Table",
      "Loveseats",
      "Ottomans",
      "Recliners",
    ],
  },
  {
    label: "Kids & Teens",
    items: [
      "Bedroom Sets",
      "Beds",
      "Daybeds",
      "Chests",
      "Dresser",
      "Headboards",
      "Nightstands",
    ],
  },
  {
    label: "Entertainment",
    items: [
      "Entertainment Centers",
      "Desks",
      "Gaming",
      "Hutches",
      "Wall Pieces",
    ],
  },
  {
    label: "Outdoor",
    items: [
      "Outdoor Sets",
      "Patio Bar",
      "Tables",
      "Sectionals",
      "Ottomans",
      "Sofas",
    ],
  },
];

function categoryKey(group: string, item: string) {
  return `${group} / ${item}`;
}

function categoryLabel(category: string) {
  return category.split(" / ").at(-1) ?? category;
}

const legacyCategoryAliases: Record<string, string[]> = {
  "Dining / Dining Room Sets": ["Dining Sets"],
  "Dining / Chairs": ["Dining Chairs"],
  "Dining / Benches": ["Dining Bench"],
  "Dining / Stools": ["Bar Stools"],
  "Living Rooms / Loveseats": ["Love Seats"],
  "Bedroom / Chests": ["Chest"],
  "Bedroom / Mirrors": ["Mirror"],
  "Bedroom / Nightstands": ["Nightstand"],
};

const categoryCards = [
  {
    name: "Bedroom",
    eyebrow: "Your quiet retreat",
    image:
      "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1400&q=82",
  },
  {
    name: "Dining",
    eyebrow: "Seats for every story",
    image:
      "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1400&q=82",
  },
  {
    name: "Living Rooms",
    eyebrow: "Made for gathering",
    image:
      "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1400&q=82",
  },
  {
    name: "Kids & Teens",
    eyebrow: "Room to grow",
    image:
      "https://images.unsplash.com/photo-1615874959474-d609969a20ed?auto=format&fit=crop&w=1400&q=82",
  },
  {
    name: "Entertainment",
    eyebrow: "Movie night starts here",
    image:
      "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=1400&q=82",
  },
  {
    name: "Outdoor",
    eyebrow: "Comfort in the open air",
    image:
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1400&q=82",
  },
];

const stores = [
  {
    city: "Montclair",
    address: "10174 Central Ave, Montclair, CA 91763",
    phone: "(909) 398-4068",
    tel: "+19093984068",
  },
  {
    city: "Riverside",
    address: "9741 Magnolia Ave, Riverside, CA 92503",
    phone: "(951) 201-3378",
    tel: "+19512013378",
  },
];

export default function Home() {
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [catalogStatus, setCatalogStatus] = useState("Loading products…");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetch("/api/products")
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => {
        if (!Array.isArray(data.products)) throw new Error("Invalid catalog");
        setCatalog(data.products);
        setCatalogStatus("");
      })
      .catch(() => setCatalogStatus("We could not load the catalog. Please refresh or call a store."));
  }, []);

  const products = useMemo(() => {
    const term = search.trim().toLowerCase();
    return catalog.filter((product) => {
      const activeGroup = menuGroups.find((group) => group.label === activeCategory);
      const activeItem = menuGroups
        .flatMap((group) => group.items.map((item) => ({ group: group.label, item })))
        .find(({ group, item }) => categoryKey(group, item) === activeCategory);
      const hasActiveItemGroup = !!activeItem && (
        product.categories.includes(activeItem.group) ||
        (activeItem.group === "Living Rooms" && product.categories.includes("Living Room"))
      );
      const hasLegacyItem = (legacyCategoryAliases[activeCategory] ?? [])
        .some((alias) => product.categories.includes(alias));
      const matchesActiveItem = !!activeItem && hasActiveItemGroup &&
        (product.categories.includes(activeItem.item) || hasLegacyItem);
      const inCategory =
        activeCategory === "All" ||
        product.categories.includes(activeCategory) ||
        (activeGroup?.label === "Living Rooms" && product.categories.includes("Living Room")) ||
        matchesActiveItem;
      const matchesSearch =
        !term ||
        product.name.toLowerCase().includes(term) ||
        product.categories.some((category) =>
          category.toLowerCase().includes(term),
        );
      return inCategory && matchesSearch;
    });
  }, [activeCategory, catalog, search]);

  const cartItems = cart;
  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const cartTotal = cartItems.reduce(
    (sum, line) => sum + Math.round(line.unitPrice * 100) * line.quantity / 100,
    0,
  );

  function chooseCategory(category: string) {
    setActiveCategory(category);
    setMenuOpen(false);
    document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" });
  }

  function addToCart(product: Product, color: string, size: string, quantity: number, extras: string[]) {
    setCart(addCartLine(cart, product, color, size, quantity, extras));
    setSelectedProduct(null);
    setCartOpen(true);
  }

  return (
    <main>
      <div className="announcement">
        <span>Local delivery from Chino · Up to 120 miles</span>
        <a href="#locations">Visit our two showrooms</a>
      </div>

      <header className="siteHeader">
        <a className="brand" href="#top" aria-label="Alex Furniture home">
          <span className="brandMark">AF</span>
          <span>
            <strong>Alex Furniture</strong>
            <small>Design your home, live your style</small>
          </span>
        </a>

        <button
          className="mobileMenuButton"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-label="Open shopping menu"
        >
          Menu
        </button>

        <nav className={menuOpen ? "mainNav isOpen" : "mainNav"}>
          {menuGroups.map((group) => (
            <div className="navGroup" key={group.label}>
              <button onClick={() => chooseCategory(group.label)}>
                {group.label} <span>⌄</span>
              </button>
              <div className="megaMenu">
                <p>Shop {group.label}</p>
                <div>
                  {group.items.map((item) => (
                    <button key={item} onClick={() => chooseCategory(categoryKey(group.label, item))}>
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
          <a href="#locations">Our Stores</a>
        </nav>

        <button className="cartButton" onClick={() => setCartOpen(true)}>
          Cart <span>{cartCount}</span>
        </button>
      </header>

      <section className="hero" id="top">
        <img
          src="https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=2200&q=88"
          alt="Warm, modern living room"
        />
        <div className="heroShade" />
        <div className="heroContent">
          <p>Family-owned · Serving Southern California</p>
          <h1>Rooms that feel<br />like you.</h1>
          <span>
            Furniture for real homes, real families, and every way you live.
          </span>
          <div className="heroActions">
            <button onClick={() => chooseCategory("All")}>Shop all furniture</button>
            <a href="#locations">Get directions</a>
          </div>
        </div>
      </section>

      <section className="categorySection" aria-labelledby="category-heading">
        <div className="sectionHeading">
          <div>
            <p>Find your room</p>
            <h2 id="category-heading">Start with the space you love.</h2>
          </div>
          <button onClick={() => chooseCategory("All")}>View everything →</button>
        </div>
        <div className="categoryGrid">
          {categoryCards.map((category) => (
            <button
              className="categoryCard"
              key={category.name}
              onClick={() => chooseCategory(category.name)}
            >
              <img src={category.image} alt="" />
              <span>
                <small>{category.eyebrow}</small>
                <strong>{category.name}</strong>
                <em>Shop now →</em>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="shopSection" id="shop" aria-labelledby="shop-heading">
        <div className="sectionHeading shopHeading">
          <div>
            <p>Curated for your home</p>
            <h2 id="shop-heading">
              {activeCategory === "All" ? "Popular right now" : categoryLabel(activeCategory)}
            </h2>
          </div>
          <label className="searchBox">
            <span>Search</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Try ‘queen bed’"
            />
          </label>
        </div>

        {catalogStatus ? <p role="status">{catalogStatus}</p> : products.length ? (
          <div className="productGrid">
            {products.map((product) => (
              <article className="productCard" key={product.id}>
                <button type="button" className="productImage productImageButton" onClick={() => setSelectedProduct(product)} aria-label={`View ${product.name}`}>
                  <img src={product.image} alt={product.name} />
                  {product.badge && <span>{product.badge}</span>}
                </button>
                <div className="productInfo">
                  <p>{product.categories.slice(0, 2).map(categoryLabel).join(" · ")}</p>
                  <h3><button type="button" className="productTitleButton" onClick={() => setSelectedProduct(product)}>{product.name}</button></h3>
                  {product.sizes && (
                    <div className="sizeList">
                      {product.sizes.map((size) => <span key={size}>{size}</span>)}
                    </div>
                  )}
                  <div>
                    <span>{listingPrice(product).from && <small>From </small>}<strong>{money(listingPrice(product).total)}</strong>{listingPrice(product).original !== null && <del className="originalPrice">{money(listingPrice(product).original!)}</del>}</span>
                    <button onClick={() => setSelectedProduct(product)}>View options</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="emptyState">
            <h3>No matches yet</h3>
            <p>Try another search or browse a different room.</p>
            <button onClick={() => { setSearch(""); setActiveCategory("All"); }}>
              Clear filters
            </button>
          </div>
        )}
        <p className="sampleNote">
          Sample products and prices are shown for this first version. Your real
          catalog can be added one item at a time or imported by CSV.
        </p>
      </section>

      <section className="deliverySection">
        <div>
          <p>Local by design</p>
          <h2>Delivery that stays close to home.</h2>
          <span>
            We deliver within 120 miles of Chino, California. We confirm your
            address, delivery fee, access, and available date before payment is
            finalized.
          </span>
        </div>
        <div className="deliveryDetails">
          <div><strong>120</strong><span>mile delivery radius</span></div>
          <div><strong>2</strong><span>showrooms to visit</span></div>
          <div><strong>Local</strong><span>service from our team</span></div>
        </div>
      </section>

      <section className="locationsSection" id="locations">
        <div className="sectionHeading">
          <div>
            <p>See it in person</p>
            <h2>Visit Alex Furniture.</h2>
          </div>
        </div>
        <div className="storeGrid">
          {stores.map((store, index) => (
            <article className="storeCard" key={store.city}>
              <span>0{index + 1}</span>
              <div>
                <p>Alex Furniture</p>
                <h3>{store.city}</h3>
                <address>{store.address}</address>
                <a href={`tel:${store.tel}`}>{store.phone}</a>
              </div>
              <a
                className="directionsLink"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.address)}`}
                target="_blank"
                rel="noreferrer"
              >
                Directions ↗
              </a>
            </article>
          ))}
        </div>
      </section>

      <footer>
        <a className="brand footerBrand" href="#top">
          <span className="brandMark">AF</span>
          <span><strong>Alex Furniture</strong><small>Design your home, live your style</small></span>
        </a>
        <div className="socialLinks">
          <a href="https://www.instagram.com/alexfurnitureriverside/" target="_blank" rel="noreferrer">Instagram ↗</a>
          <a href="https://www.facebook.com/100063332702090/" target="_blank" rel="noreferrer">Facebook ↗</a>
          <a href="https://www.tiktok.com/@alexfurniturellc" target="_blank" rel="noreferrer">TikTok ↗</a>
        </div>
        <p>© {new Date().getFullYear()} Alex Furniture. Local delivery only.</p>
      </footer>

      {cartOpen && (
        <div className="cartBackdrop" onMouseDown={() => setCartOpen(false)}>
          <aside
            className="cartDrawer"
            onMouseDown={(event) => event.stopPropagation()}
            aria-label="Shopping cart"
          >
            <div className="cartHeader">
              <div><p>Your selections</p><h2>Cart ({cartCount})</h2></div>
              <button onClick={() => setCartOpen(false)} aria-label="Close cart">×</button>
            </div>
            <div className="cartItems">
              {cartItems.length ? cartItems.map((line) => (
                <div className="cartItem" key={line.key}>
                  <img src={line.product.image} alt="" />
                  <div>
                    <h3>{line.product.name}</h3>
                    {(line.color || line.size) && <p className="cartVariant">{[line.color && `Color: ${line.color}`, line.size && `Size: ${line.size}`].filter(Boolean).join(" · ")}</p>}
                    <p>{money(line.unitPrice)} · Qty {line.quantity}</p>
                    {line.extraNames.length > 0 && <p className="cartVariant">Extras: {line.extraNames.join(", ")}</p>}
                    <button onClick={() => setCart((current) => current.filter((item) => item.key !== line.key))}>Remove</button>
                  </div>
                </div>
              )) : <div className="cartEmpty"><p>Your cart is ready for something beautiful.</p><button onClick={() => setCartOpen(false)}>Keep shopping</button></div>}
            </div>
            {cartItems.length > 0 && (
              <div className="cartFooter">
                <div><span>Estimated subtotal</span><strong>${cartTotal.toLocaleString()}</strong></div>
                <p>Delivery fee and address eligibility are confirmed before payment.</p>
                <a href={`tel:${stores[0].tel}`}>Call Montclair to complete order</a>
              </div>
            )}
          </aside>
        </div>
      )}
      {selectedProduct && <ProductDetails key={selectedProduct.id} product={selectedProduct} onClose={() => setSelectedProduct(null)} onAdd={(color, size, quantity, extras) => addToCart(selectedProduct, color, size, quantity, extras)} />}
      <CustomerChat hidden={cartOpen || !!selectedProduct} />
    </main>
  );
}
