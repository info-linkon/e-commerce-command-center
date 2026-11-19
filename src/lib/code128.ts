// Minimal Code 128 (set B, with set C for long digit runs) barcode encoder → SVG.
// No dependencies; good enough for shipment numbers / order numbers.

// Bar/space widths for symbol values 0..106 (106 = STOP, which has an extra bar).
const PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112",
];

const START_B = 104;
const START_C = 105;
const CODE_B = 100;
const CODE_C = 99;
const STOP = 106;

/** Returns the Code 128 symbol values (including start, checksum and stop). */
export function encodeCode128(text: string): number[] {
  for (const ch of text) {
    const c = ch.charCodeAt(0);
    if (c < 32 || c > 126) throw new Error(`Code128: unsupported character "${ch}"`);
  }
  const values: number[] = [];
  let i = 0;
  let set: "B" | "C";
  const digitRun = (from: number) => {
    let n = 0;
    while (from + n < text.length && text[from + n] >= "0" && text[from + n] <= "9") n++;
    return n;
  };

  // Use set C when the text starts with ≥4 digits (or is entirely an even run of digits).
  const leading = digitRun(0);
  if (leading >= 4 || (leading === text.length && leading >= 2 && leading % 2 === 0)) {
    set = "C";
    values.push(START_C);
  } else {
    set = "B";
    values.push(START_B);
  }

  while (i < text.length) {
    if (set === "C") {
      const run = digitRun(i);
      if (run >= 2) {
        values.push(Number(text.slice(i, i + 2)));
        i += 2;
        continue;
      }
      values.push(CODE_B);
      set = "B";
      continue;
    }
    const run = digitRun(i);
    // Switch to C for runs of ≥6 digits (or ≥4 at the end), keeping an even count.
    if (run >= 6 || (run >= 4 && i + run === text.length)) {
      if (run % 2 === 1) {
        values.push(text.charCodeAt(i) - 32);
        i++;
      }
      values.push(CODE_C);
      set = "C";
      continue;
    }
    values.push(text.charCodeAt(i) - 32);
    i++;
  }

  let checksum = values[0];
  for (let k = 1; k < values.length; k++) checksum += values[k] * k;
  values.push(checksum % 103);
  values.push(STOP);
  return values;
}

/** Renders text as a Code 128 SVG string. */
export function code128Svg(
  text: string,
  { height = 60, moduleWidth = 2, quietZone = 10 }: { height?: number; moduleWidth?: number; quietZone?: number } = {},
): string {
  const widths = encodeCode128(text).map((v) => PATTERNS[v]).join("");
  let x = quietZone;
  let bar = true;
  const rects: string[] = [];
  for (const w of widths) {
    const width = Number(w) * moduleWidth;
    if (bar) rects.push(`<rect x="${x}" y="0" width="${width}" height="${height}"/>`);
    x += width;
    bar = !bar;
  }
  const total = x + quietZone;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${height}" width="100%" height="${height}" preserveAspectRatio="none" shape-rendering="crispEdges"><rect width="${total}" height="${height}" fill="#fff"/><g fill="#000">${rects.join("")}</g></svg>`;
}
