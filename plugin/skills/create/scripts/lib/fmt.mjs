// Exact decimal formatting for gate output. That output is pinned by tests and parsed by graders, so a number has to
// render identically every time: ties settle to even, and a whole float keeps its `.0` so a timestamp stays a number
// and not an integer. `toFixed` rounds ties away from zero, so these build the decimal expansion with BigInt instead.

/** The exact value of a finite double as sign * mantissa * 2^exponent. */
function decompose(value) {
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, value);
  const bits = (BigInt(view.getUint32(0)) << 32n) | BigInt(view.getUint32(4));
  const biased = Number((bits >> 52n) & 0x7ffn);
  const fraction = bits & 0xfffffffffffffn;
  return {
    negative: (bits >> 63n) & 1n ? true : false,
    mantissa: biased === 0 ? fraction : fraction | (1n << 52n),
    exponent: biased === 0 ? -1074 : biased - 1075,
  };
}

function pow(base, exponent) {
  return base ** BigInt(exponent);
}

/** The digits of |value| rounded to `places` decimals, half to even, as a BigInt of value * 10^places. */
function scaled(value, places) {
  const { mantissa, exponent } = decompose(value);
  const numerator = mantissa * pow(10n, places) * (exponent >= 0 ? pow(2n, exponent) : 1n);
  const denominator = exponent >= 0 ? 1n : pow(2n, -exponent);
  const quotient = numerator / denominator;
  const doubled = (numerator % denominator) * 2n;
  if (doubled > denominator || (doubled === denominator && quotient % 2n === 1n)) return quotient + 1n;
  return quotient;
}

/** `value` written with exactly `places` decimals, ties to even. */
export function fixed(value, places) {
  if (!Number.isFinite(value)) return Number.isNaN(value) ? "nan" : value > 0 ? "inf" : "-inf";
  const digits = scaled(Math.abs(value), places)
    .toString()
    .padStart(places + 1, "0");
  const point = places === 0 ? digits : `${digits.slice(0, -places)}.${digits.slice(-places)}`;
  // A negative zero keeps its sign, so -0.004 at 2 places reads as -0.00 rather than 0.00.
  return (value < 0 || Object.is(value, -0) ? "-" : "") + point;
}

/** `value` rounded to `places` decimals, ties to even. */
export function roundHalfEven(value, places = 0) {
  if (!Number.isFinite(value)) return value;
  return Number(fixed(value, places));
}

const SIGNIFICANT = 6;

/** Six significant digits, trailing zeros stripped, exponent form outside 10^-4 to 10^6. */
export function g(value) {
  if (!Number.isFinite(value)) return Number.isNaN(value) ? "nan" : value > 0 ? "inf" : "-inf";
  if (value === 0) return "0";
  const strip = (text) => (text.includes(".") ? text.replace(/\.?0+$/, "") : text);
  const [mantissa, exponent] = value.toExponential(SIGNIFICANT - 1).split("e");
  const power = Number(exponent);
  if (power < -4 || power >= SIGNIFICANT) {
    const sign = power < 0 ? "-" : "+";
    return `${strip(mantissa)}e${sign}${String(Math.abs(power)).padStart(2, "0")}`;
  }
  return strip(fixed(value, SIGNIFICANT - 1 - power));
}

/** A float literal that keeps its `.0` on a whole number. Domain: the magnitudes a timestamp takes. */
export function floatLiteral(value) {
  if (Number.isInteger(value) && Math.abs(value) < 1e16) return `${value}.0`;
  return String(value);
}

/** Slice by code point. JS slices by UTF-16 unit, so an emoji would shift every later cut. */
export function sliceChars(text, length) {
  return [...text].slice(0, length).join("");
}

/** Length in code points, so an emoji counts as the one character a reader sees. */
export function charCount(text) {
  return [...text].length;
}
