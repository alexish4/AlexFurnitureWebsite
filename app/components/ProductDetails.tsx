"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { options, type ShopProduct } from "../lib/cart";
import "./product-details.css";

export default function ProductDetails({ product, onClose, onAdd }: {
  product: ShopProduct;
  onClose: () => void;
  onAdd: (color: string, size: string, quantity: number) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const colors = options(product.colors);
  const sizes = options(product.sizes);
  const [color, setColor] = useState(colors.length === 1 ? colors[0] : "");
  const [size, setSize] = useState(sizes.length === 1 ? sizes[0] : "");
  const [quantity, setQuantity] = useState("1");
  const [error, setError] = useState("");

  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => { element?.close(); document.body.style.overflow = previousOverflow; previousFocus?.focus(); };
  }, []);

  function submit(event: FormEvent) {
    event.preventDefault();
    try { onAdd(color, size, Number(quantity)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Please check your selections."); }
  }

  return <dialog ref={dialog} className="productDetails" aria-labelledby="product-detail-title" onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose(); } }}>
    <button type="button" className="productDetailsClose" onClick={onClose} aria-label="Close product details">×</button>
    <div className="productDetailsGrid">
      <div className="productDetailsPhoto">{product.image ? <img src={product.image} alt={product.name} /> : <span>Photo coming soon</span>}</div>
      <div className="productDetailsBody">
        <p className="productDetailsEyebrow">Alex Furniture · Local delivery</p>
        <h2 id="product-detail-title">{product.name}</h2>
        {product.sku && <p className="productDetailsSku">SKU: {product.sku}</p>}
        <strong className="productDetailsPrice">{product.price.toLocaleString("en-US", { style: "currency", currency: "USD" })}</strong>
        <h3>About this item</h3>
        <p className="productDetailsDescription">{product.description?.trim() || "Contact our team for materials, dimensions, and more details about this item."}</p>
        <form onSubmit={submit}>
          {colors.length > 0 && <fieldset><legend>Choose a color</legend><div className="productOptionGrid">{colors.map((value) => <label key={value} className={color === value ? "selected" : ""}><input type="radio" name="product-color" value={value} checked={color === value} required onChange={() => setColor(value)} />{value}</label>)}</div></fieldset>}
          {sizes.length > 0 && <fieldset><legend>Choose a size</legend><div className="productOptionGrid">{sizes.map((value) => <label key={value} className={size === value ? "selected" : ""}><input type="radio" name="product-size" value={value} checked={size === value} required onChange={() => setSize(value)} />{value}</label>)}</div></fieldset>}
          <label className="productQuantity">Quantity<input type="number" min="1" max="99" step="1" required value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label>
          {error && <p role="alert">{error}</p>}
          <button className="productDetailsAdd" type="submit">Add to cart</button>
        </form>
        <p className="productDetailsNote">Delivery within 120 miles of Chino. Call to confirm availability, delivery eligibility, fees, and timing before payment.</p>
      </div>
    </div>
  </dialog>;
}
