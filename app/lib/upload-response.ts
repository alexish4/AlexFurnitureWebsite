/** Proxies and hosting services can return HTML or text instead of API JSON. */
export async function readUploadResponse(response: Response): Promise<string> {
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    // Keep the HTTP failure useful without displaying a server's HTML page.
  }
  const record = data && typeof data === "object" ? data as Record<string, unknown> : undefined;
  if (!response.ok) {
    if (typeof record?.error === "string" && record.error) throw new Error(record.error);
    if (response.status === 413) {
      throw new Error("The server rejected this photo as too large. Try a smaller image, or ask the site administrator to raise the upload request limit to at least 9 MB.");
    }
    throw new Error(`Could not upload photo (HTTP ${response.status}). The server or hosting service returned an unexpected response. Please try again.`);
  }
  if (typeof record?.url !== "string" || !record.url) {
    throw new Error("The server did not confirm the photo upload. Refresh the admin page and try again.");
  }
  return record.url;
}
