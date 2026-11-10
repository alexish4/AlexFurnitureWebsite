/** Reuse the catalog's existing password/email authorization for photo uploads. */
export function isSelfHosted() {
  return process.env.SELF_HOSTED === "true";
}

export function isAdmin(request: Request) {
  if (process.env.NODE_ENV !== "production") return true;
  const email = request.headers.get("oai-authenticated-user-email")?.toLowerCase();
  const allowed = new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((address) => address.trim().toLowerCase())
      .filter(Boolean),
  );
  const emailAllowed = Boolean(email && allowed.size > 0 && allowed.has(email));
  const expectedPassword = process.env.ADMIN_PASSWORD ?? "";
  const suppliedPassword = request.headers.get("x-admin-password") ?? "";
  const passwordAllowed =
    isSelfHosted() && expectedPassword.length >= 12 && suppliedPassword === expectedPassword;
  return emailAllowed || passwordAllowed;
}
