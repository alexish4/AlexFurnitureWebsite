"use client";

import { useState } from "react";

type Props = {
  label: string;
  value: string;
  onChange: (url: string) => void;
  adminPassword: string;
  onUploadStateChange: (uploading: boolean) => void;
  placeholder?: string;
};

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/** Preserves the photo link field, but also uploads a device image immediately. */
export default function CatalogImageField({ label, value, onChange, adminPassword, onUploadStateChange, placeholder }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function upload(file: File) {
    setError("");
    if (file.size > MAX_IMAGE_BYTES || !file.size) {
      setError("Choose an image smaller than 8 MB.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      setError("Choose a JPEG, PNG, WebP, or GIF image.");
      return;
    }
    setUploading(true);
    onUploadStateChange(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/uploads", {
        method: "POST",
        headers: adminPassword ? { "X-Admin-Password": adminPassword } : {},
        body,
      });
      const data = await response.json();
      if (!response.ok || typeof data.url !== "string") throw new Error(data.error || "Could not upload photo.");
      onChange(data.url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not upload photo.");
    } finally {
      setUploading(false);
      onUploadStateChange(false);
    }
  }

  return <div className="imageUploadField">
    <label>{label}<input type="text" inputMode="url" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder || "https://manufacturer.com/photo.jpg"} /></label>
    <label>Or upload a photo from your device
      <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploading} onChange={(event) => {
        const file = event.currentTarget.files?.[0];
        event.currentTarget.value = "";
        if (file) void upload(file);
      }} />
    </label>
    {uploading && <span role="status">Uploading photo…</span>}
    {error && <span className="imageUploadError" role="alert">{error}</span>}
  </div>;
}
