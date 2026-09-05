export function roundSpread(rawValue) {
  const n = Number(rawValue);
  if (Number.isNaN(n)) return null;
  const isWhole = Number.isInteger(n);
  return isWhole ? n + 0.5 : n;
}
