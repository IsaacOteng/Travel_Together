/* Trip prices are entered in cedis and can run to five figures, where an
   unseparated "GH₵20000" is genuinely hard to read at card size. */
export function formatPrice(value) {
  const n = Number(value);
  if (value == null || Number.isNaN(n)) return "";
  if (n === 0) return "Free";
  return `GH₵${n.toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;
}

/* Tags arrive from the API lower-cased ("hiking"); they're shown as labels. */
export function titleCase(s = "") {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
