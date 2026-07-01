/**
 * Aritmética de dinero sin `float` (§13). Opera sobre strings numéricos
 * a escala fija (8 decimales, igual que numeric(20,8) en BD) usando BigInt,
 * evitando errores de redondeo de IEEE-754.
 */
const SCALE = 8;

function toScaled(value: string): bigint {
  const v = value.trim();
  const neg = v.startsWith("-");
  const [intPart, fracPart = ""] = (neg ? v.slice(1) : v).split(".");
  const frac = (fracPart + "0".repeat(SCALE)).slice(0, SCALE);
  const scaled = BigInt((intPart || "0") + frac);
  return neg ? -scaled : scaled;
}

function fromScaled(scaled: bigint): string {
  const neg = scaled < 0n;
  const digits = (neg ? -scaled : scaled).toString().padStart(SCALE + 1, "0");
  const intPart = digits.slice(0, digits.length - SCALE);
  const fracPart = digits.slice(digits.length - SCALE);
  return `${neg ? "-" : ""}${intPart}.${fracPart}`;
}

/** a + b, exacto, devuelto como string con 8 decimales. */
export function addMoney(a: string, b: string): string {
  return fromScaled(toScaled(a) + toScaled(b));
}

/** a − b, exacto, devuelto como string con 8 decimales. */
export function subtractMoney(a: string, b: string): string {
  return fromScaled(toScaled(a) - toScaled(b));
}

/** Signo de un monto en string: 1, -1 o 0 (sin pasar por float). */
export function signOfMoney(value: string): -1 | 0 | 1 {
  const s = toScaled(value);
  return s > 0n ? 1 : s < 0n ? -1 : 0;
}

/**
 * Formato de display de dinero: símbolo `$`, 2 decimales y separador de miles.
 * Positivo → `$120.00`; negativo → `-$20.50`; cero → `$0.00`.
 * El signo va antes del `$`. No depende del locale (estilo $ = en-US).
 */
export function formatMoney(value: string | number): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${n < 0 ? "-" : ""}$${abs}`;
}
