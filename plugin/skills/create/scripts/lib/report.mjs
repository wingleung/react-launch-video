// The gate line every script prints: a four-character mark, two spaces, then the thing being reported.
export function mark(ok, required = true) {
  if (ok) return "ok  ";
  return required ? "FAIL" : "warn";
}
