"use client";
import { useState } from "react";
import { type PriceOptions } from "../lib/product-options";
import "./catalog-options.css";

export function ColorEditor({ colors, onChange }: { colors: string[]; onChange: (colors: string[]) => void }) {
  const [custom, setCustom] = useState("");
  const common = ["Black", "White", "Gray", "Beige", "Brown", "Blue", "Green", "Cream", "Walnut", "Natural"];
  const choices = [...new Set([...common, ...colors])];
  return <fieldset className="guidedBlock"><legend>Available colors (optional)</legend><p>Tap to select or remove colors. Leave all off if customers do not need a choice.</p><div className="optionButtons">{choices.map((color) => <button key={color} type="button" aria-pressed={colors.includes(color)} onClick={() => onChange(colors.includes(color) ? colors.filter((value) => value !== color) : [...colors, color])}>{colors.includes(color) ? "✓ " : ""}{color}</button>)}</div><div className="customColor"><input aria-label="Custom color" placeholder="Another color…" value={custom} onChange={(event) => setCustom(event.target.value)} /><button type="button" onClick={() => { const name = custom.trim(); if (name) onChange([...new Set([...colors,name])]); setCustom(""); }}>Add color</button></div></fieldset>;
}

export function PhotoEditor({ value, colors, onChange }: { value: PriceOptions; colors: string[]; onChange: (value: PriceOptions) => void }) {
  const images = value.images || [];
  return <fieldset className="guidedBlock"><legend>More photos / color photos</legend><p>Add approved image links. Assign a color to show its photos when a customer selects that color.</p>{images.map((photo,index) => <div className="photoEditorRow" key={index}><label>Photo link<input type="url" value={photo.url} onChange={(event) => onChange({...value, images: images.map((item,i)=>i===index?{...item,url:event.target.value}:item)})} placeholder="https://…" /></label><label>Photo color<select value={photo.color} onChange={(event) => onChange({...value, images: images.map((item,i)=>i===index?{...item,color:event.target.value}:item)})}><option value="">All colors / general photo</option>{[...new Set([...colors,...(photo.color ? [photo.color] : [])])].map((color)=><option key={color}>{color}</option>)}</select></label>{photo.url && <img src={photo.url} alt={`Photo ${index+1} preview`} />}<button type="button" onClick={()=>onChange({...value,images:images.filter((_,i)=>i!==index)})}>Remove photo</button></div>)}<button className="addPieceButton" type="button" disabled={images.length>=30} onClick={()=>onChange({...value,images:[...images,{url:"",color:""}]})}>+ Add photo</button></fieldset>;
}

export function SizePriceEditor({ sizes, choices, value, onSizes, onChange, label = "Price" }: { sizes: string[]; choices: string[]; value: PriceOptions; onSizes?: (sizes: string[])=>void; onChange: (value: PriceOptions)=>void; label?: string }) {
  const setAmount = (size:string, field:"sizePrices"|"sizeOriginalPrices", text:string) => {
    const next = {...value[field]}; if (text === "") delete next[size]; else next[size] = Number(text);
    onChange({...value,[field]:next});
  };
  return <fieldset className="guidedBlock"><legend>{label} by size</legend><p>Select a size, then enter its price on the right. Original price is optional.</p>{[...new Set([...choices,...sizes])].map((size) => <div className="sizePriceRow" key={size}><button type="button" aria-pressed={sizes.includes(size)} disabled={!onSizes} onClick={()=>onSizes?.(sizes.includes(size)?sizes.filter((item)=>item!==size):[...sizes,size])}>{sizes.includes(size)?"✓ ":""}{size}</button>{sizes.includes(size) && <><label>{label} ($)<input required type="number" min="0" step="0.01" value={value.sizePrices?.[size] ?? ""} onChange={(event)=>setAmount(size,"sizePrices",event.target.value)} /></label><label>Original ($)<input type="number" min="0" step="0.01" value={value.sizeOriginalPrices?.[size] ?? ""} onChange={(event)=>setAmount(size,"sizeOriginalPrices",event.target.value)} /></label></>}</div>)}</fieldset>;
}
