"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { options, type ShopProduct } from "../lib/cart";
import "./product-details.css";
import { selectionPrice, listingPrice, money } from "../lib/product-options";

export default function ProductDetails({ product, onClose, onAdd }: {
  product: ShopProduct;
  onClose: () => void;
  onAdd: (color: string, size: string, quantity: number, extras: string[]) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const colors = options(product.colors);
  const sizes = options(product.sizes);
  const [color, setColor] = useState(colors.length === 1 ? colors[0] : "");
  const [size, setSize] = useState(sizes.length === 1 ? sizes[0] : "");
  const [quantity, setQuantity] = useState("1");
  const [error, setError] = useState("");
  const [extras, setExtras] = useState<string[]>([]);
  const [photoIndex, setPhotoIndex] = useState(0);
  const configuredPhotos = product.configuration?.images || [];
  const colorPhotos = color ? configuredPhotos.filter((photo)=>photo.color===color) : [];
  const generalPhotos = configuredPhotos.filter((photo)=>!photo.color);
  const photos = [...new Set([...colorPhotos.map((photo)=>photo.url), ...(!colorPhotos.length && product.image ? [product.image] : []), ...generalPhotos.map((photo)=>photo.url), ...(!color ? configuredPhotos.map((photo)=>photo.url) : [])])];
  const price = !size && sizes.length > 1 ? listingPrice(product) : selectionPrice(product,size,extras);
  const displayedPrice = !size && sizes.length > 1 ? { ...selectionPrice(product, listingPrice(product).size,extras), from: true } : {...price, from: false};
  const pieces = product.configuration?.pieces || [];


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
    try { onAdd(color, size, Number(quantity), extras); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Please check your selections."); }
  }

  return <dialog ref={dialog} className="productDetails" aria-labelledby="product-detail-title" onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose(); } }}>
    <button type="button" className="productDetailsClose" onClick={onClose} aria-label="Close product details">×</button>
    <div className="productDetailsGrid">
      <div><div className="productDetailsPhoto">{photos.length ? <img src={photos[Math.min(photoIndex,photos.length-1)]} alt={`${product.name}${color ? ` — ${color}` : ""}`} /> : <span>Photo coming soon</span>}</div><div className="productThumbnails">{photos.map((url,index)=><button key={url} type="button" aria-label={`Show photo ${index+1}`} aria-pressed={photoIndex===index} onClick={()=>setPhotoIndex(index)}><img src={url} alt={`Product photo ${index+1}`} /></button>)}</div></div>
      <div className="productDetailsBody">
        <p className="productDetailsEyebrow">Alex Furniture · Local delivery</p>
        <h2 id="product-detail-title">{product.name}</h2>
        {product.sku && <p className="productDetailsSku">SKU: {product.sku}</p>}
        <div className="productDetailsPrice" aria-live="polite">{displayedPrice.from && <small>From </small>}<strong>{money(displayedPrice.total)}</strong>{displayedPrice.original !== null && <><del className="originalPrice">{money(displayedPrice.original)}</del><span className="saleLabel">Save {money(displayedPrice.original-displayedPrice.total)}</span></>}</div>
        <h3>About this item</h3>
        <p className="productDetailsDescription">{product.description?.trim() || "Contact our team for materials, dimensions, and more details about this item."}</p>
        <form onSubmit={submit}>
          {colors.length > 0 && <fieldset><legend>Choose a color</legend><div className="productOptionGrid">{colors.map((value) => <label key={value} className={color === value ? "selected" : ""}><input type="radio" name="product-color" value={value} checked={color === value} required onChange={() => {setColor(value); setPhotoIndex(0);}} />{value}</label>)}</div></fieldset>}
          {sizes.length > 0 && <fieldset><legend>Choose a size</legend><div className="productOptionGrid">{sizes.map((value) => <label key={value} className={size === value ? "selected" : ""}><input type="radio" name="product-size" value={value} checked={size === value} required onChange={() => setSize(value)} />{value}</label>)}</div></fieldset>}
          {pieces.some((piece)=>!piece.optional) && <section><h3>Included in this set</h3><ul>{pieces.filter((piece)=>!piece.optional).map((piece)=><li key={piece.localId}>{piece.name}</li>)}</ul></section>}
          {pieces.some((piece)=>piece.optional) && <fieldset><legend>Complete your set (optional)</legend>{pieces.filter((piece)=>piece.optional).map((piece)=><label className="setAddon" key={piece.localId}><input type="checkbox" checked={extras.includes(piece.localId)} onChange={(event)=>setExtras(event.target.checked?[...extras,piece.localId]:extras.filter((id)=>id!==piece.localId))} /><span><strong>Add {piece.type === "Chests" ? "chest" : piece.type === "Chairs" ? "chair" : piece.name} — +{money(piece.price)}</strong>{piece.description && <small>{piece.description}</small>}</span></label>)}</fieldset>}
          <label className="productQuantity">Quantity<input type="number" min="1" max="99" step="1" required value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label>
          {error && <p role="alert">{error}</p>}
          <button className="productDetailsAdd" type="submit">Add to cart</button>
        </form>
        <p className="productDetailsNote">Delivery within 120 miles of Chino. Call to confirm availability, delivery eligibility, fees, and timing before payment.</p>
      </div>
    </div>
  </dialog>;
}
