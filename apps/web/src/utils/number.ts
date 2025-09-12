export function clampDecimalsForInput(s: string, dp = 6): string {
  if (!s) return "";
  // normaliser
  s = s.replace(",", ".").replace(/[^\d.]/g, "");
  // garder un seul point
  const firstDot = s.indexOf(".");
  if (firstDot !== -1) {
    s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, "");
  }
  // découpe int/frac
  const [int, frac = ""] = s.split(".");
  // limiter la partie décimale
  const clampedFrac = frac.slice(0, dp);
  // gérer cas partiels: ".", "1."
  if (firstDot !== -1) return `${int || "0"}.${clampedFrac}`;
  return int;
}

export function tidyOnBlur(s: string, dp = 6): string {
  if (!s) return "";
  // enlever trailing "."
  if (s.endsWith(".")) s = s.slice(0, -1);
  // supprimer zéros inutiles en fin de décimales
  const [i, f = ""] = s.split(".");
  const f2 = f.slice(0, dp).replace(/0+$/, "");
  return f2 ? `${i}.${f2}` : i;
}
