// gta6-meme-x-01 — "Traffic Citation" (Leonida PD)
//
// A working entry for the make.fun bounty "Post a GTA 6 meme on X".
// Node 22, standard library only. No network, no wall clock, no files
// outside the repository: running it twice writes the exact same bytes.
//
// What it does:
//   1. Draws the meme itself — a traffic citation from Leonida PD
//      fining Jason for doomscrolling while driving in Vice City:
//      "HE SCROLLED. THE CAR SWERVED." — "ONE SCROLL. ONE TICKET.
//      ZERO EXCUSES." — as a 1024x1024 PNG, pixel by pixel, from code.
//      The make.fun ghost (white, sparkle eyes, magenta star coin) is
//      the officer who wrote the ticket, drawn from shapes; "make.fun"
//      is written under it and stamped on the citation, so the judge
//      can see make.fun in the picture itself.
//   2. Copies POST.json from the repository root to the output dir,
//      where the gate reads it. That is the program's contract with
//      the grader; the post on X is the entry.
//
// The joke, in one line: GTA 6 punishes checking your phone while
// driving — Jason scrolled, the car swerved, and his AI agent paid
// the fine with real make.fun earnings.
//
// (An earlier "Doctor's Note" version of this meme is kept as a backup
// in ~/workspace/makefun/gta6-meme-x-01-doctor-note-backup/ — the
// doctor's-note lane was too crowded: 57 such entries, one with the
// identical title. The citation lane is nearly empty.)
//
// Run it the way the grader does:
//   mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts
// It writes out/meme.png and out/POST.json and prints their sha256.

import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import { join } from 'node:path';

const BOT_DIR = process.env.MAKEFUN_BOT_DIR ?? '/bot';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// ---------------------------------------------------------------------------
// Colours (Leonida sunset + hospital paper)
// ---------------------------------------------------------------------------
const PAPER: RGB = [255, 253, 245]; // citation paper
const NAVY: RGB = [22, 35, 63]; // police navy: header band + titles
const INK: RGB = [20, 20, 28]; // ink for values
const MAGENTA: RGB = [230, 0, 126]; // make.fun magenta (stamp + coin)
const GOLD: RGB = [255, 200, 40]; // police badge + wanted stars
const GHOST: RGB = [255, 255, 255];
const GHOST_SHADOW: RGB = [214, 222, 240]; // soft blue-grey shadow behind ghost
const BLUSH: RGB = [255, 150, 190];
const GREY: RGB = [120, 110, 100];

type RGB = [number, number, number];

// ---------------------------------------------------------------------------
// 5x7 bitmap font (capitals, digits, punctuation used by this meme)
// Each glyph is 7 rows of 5 bits, '#' = on, '.' = off.
// ---------------------------------------------------------------------------
const FONT: Record<string, string[]> = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.####'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '#.#.#', '.#.#.'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '..##.', '.#...', '#....', '#####'],
  '3': ['#####', '...#.', '..#..', '...#.', '....#', '#...#', '.###.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  ',': ['.....', '.....', '.....', '.....', '.##..', '..#..', '.#...'],
  ':': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.....'],
  '-': ['.....', '.....', '.....', '.###.', '.....', '.....', '.....'],
  '%': ['##..#', '##.#.', '...#.', '..#..', '.#...', '#.##.', '#..##'],
  "'": ['..#..', '..#..', '.#...', '.....', '.....', '.....', '.....'],
  '(': ['...#.', '..#..', '.#...', '.#...', '.#...', '..#..', '...#.'],
  ')': ['.#...', '..#..', '...#.', '...#.', '...#.', '..#..', '.#...'],
  '/': ['....#', '...#.', '...#.', '..#..', '.#...', '.#...', '#....'],
  '&': ['.##..', '#..#.', '#.#..', '.#...', '#.#.#', '#..#.', '.##.#'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '?': ['.###.', '#...#', '....#', '..##.', '..#..', '.....', '..#..'],
  '+': ['.....', '..#..', '..#..', '.###.', '..#..', '..#..', '.....'],
};

const GLYPH_W = 5;
const GLYPH_H = 7;

function textWidth(text: string, scale: number): number {
  // 1 blank column (scaled) between glyphs, none after the last.
  if (text.length === 0) return 0;
  return text.length * (GLYPH_W + 1) * scale - scale;
}

// ---------------------------------------------------------------------------
// Canvas: a plain RGB pixel buffer with small drawing primitives
// ---------------------------------------------------------------------------
class Canvas {
  readonly w: number;
  readonly h: number;
  readonly buf: Uint8Array;

  constructor(w: number, h: number, bg: RGB) {
    this.w = w;
    this.h = h;
    this.buf = new Uint8Array(w * h * 3);
    for (let i = 0; i < w * h; i++) {
      this.buf[i * 3] = bg[0];
      this.buf[i * 3 + 1] = bg[1];
      this.buf[i * 3 + 2] = bg[2];
    }
  }

  set(x: number, y: number, c: RGB): void {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    if (xi < 0 || yi < 0 || xi >= this.w || yi >= this.h) return;
    const i = (yi * this.w + xi) * 3;
    this.buf[i] = c[0];
    this.buf[i + 1] = c[1];
    this.buf[i + 2] = c[2];
  }

  fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
    const x0 = Math.max(0, Math.floor(x));
    const y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(this.w, Math.ceil(x + w));
    const y1 = Math.min(this.h, Math.ceil(y + h));
    for (let yy = y0; yy < y1; yy++) {
      for (let xx = x0; xx < x1; xx++) {
        const i = (yy * this.w + xx) * 3;
        this.buf[i] = c[0];
        this.buf[i + 1] = c[1];
        this.buf[i + 2] = c[2];
      }
    }
  }

  hline(x0: number, x1: number, y: number, c: RGB): void {
    if (x1 < x0) [x0, x1] = [x1, x0];
    for (let x = Math.floor(x0); x <= Math.floor(x1); x++) this.set(x, y, c);
  }

  line(x0: number, y0: number, x1: number, y1: number, c: RGB): void {
    // Bresenham.
    let dx = Math.abs(x1 - x0);
    let dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    let x = Math.round(x0);
    let y = Math.round(y0);
    const tx = Math.round(x1);
    const ty = Math.round(y1);
    for (;;) {
      this.set(x, y, c);
      if (x === tx && y === ty) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y += sy;
      }
    }
  }

  thickLine(x0: number, y0: number, x1: number, y1: number, t: number, c: RGB): void {
    const r = Math.max(1, Math.floor(t / 2));
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let s = 0; s <= steps; s++) {
      const x = x0 + ((x1 - x0) * s) / steps;
      const y = y0 + ((y1 - y0) * s) / steps;
      this.fillCircle(x, y, r, c);
    }
  }

  fillCircle(cx: number, cy: number, r: number, c: RGB): void {
    const rr = Math.round(r);
    for (let dy = -rr; dy <= rr; dy++) {
      const dx = Math.floor(Math.sqrt(Math.max(0, rr * rr - dy * dy)));
      this.hline(cx - dx, cx + dx, cy + dy, c);
    }
  }

  ring(cx: number, cy: number, r: number, t: number, c: RGB): void {
    for (let a = 0; a < 360; a += 1) {
      const rad = (a * Math.PI) / 180;
      for (let k = -Math.floor(t / 2); k <= Math.floor(t / 2); k++) {
        this.set(cx + (r + k) * Math.cos(rad), cy + (r + k) * Math.sin(rad), c);
      }
    }
  }

  // Filled polygon (scanline fill over the edge list).
  fillPolygon(points: Array<[number, number]>, c: RGB): void {
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [, y] of points) {
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const xs: number[] = [];
      for (let i = 0; i < points.length; i++) {
        const [x0, y0] = points[i];
        const [x1, y1] = points[(i + 1) % points.length];
        if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) {
          xs.push(x0 + ((y - y0) * (x1 - x0)) / (y1 - y0));
        }
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        this.hline(xs[k], xs[k + 1], y, c);
      }
    }
  }

  star(cx: number, cy: number, rOuter: number, rInner: number, c: RGB): void {
    const pts: Array<[number, number]> = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? rOuter : rInner;
      const a = (Math.PI / 2) * 3 + (i * Math.PI) / 5;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    this.fillPolygon(pts, c);
  }

  text(x: number, y: number, s: string, scale: number, c: RGB): void {
    const upper = s.toUpperCase();
    let cx = Math.floor(x);
    const cy = Math.floor(y);
    for (const ch of upper) {
      const glyph = FONT[ch] ?? FONT['?'];
      for (let row = 0; row < GLYPH_H; row++) {
        for (let col = 0; col < GLYPH_W; col++) {
          if (glyph[row][col] === '#') {
            this.fillRect(cx + col * scale, cy + row * scale, scale, scale, c);
          }
        }
      }
      cx += (GLYPH_W + 1) * scale;
    }
  }

  // Largest scale (from the list) whose width fits the 48px margins, centred.
  textCentred(cx: number, y: number, s: string, scales: number[], c: RGB): void {
    let best = scales[scales.length - 1];
    for (const sc of scales) {
      if (textWidth(s, sc) <= this.w - 96) {
        best = sc;
        break;
      }
    }
    this.text(cx - textWidth(s, best) / 2, y, s, best, c);
  }

  // Draw text at x, shrinking the scale until it fits maxWidth.
  textFit(x: number, y: number, s: string, scales: number[], maxWidth: number, c: RGB): number {
    let best = scales[scales.length - 1];
    for (const sc of scales) {
      if (textWidth(s, sc) <= maxWidth) {
        best = sc;
        break;
      }
    }
    this.text(x, y, s, best, c);
    return best;
  }
}

// ---------------------------------------------------------------------------
// PNG encoding (pure stdlib: zlib deflate + CRC32)
// ---------------------------------------------------------------------------
const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePNG(canvas: Canvas): Buffer {
  const raw = Buffer.alloc((canvas.w * 3 + 1) * canvas.h);
  for (let y = 0; y < canvas.h; y++) {
    raw[y * (canvas.w * 3 + 1)] = 0; // filter: none
    raw.set(canvas.buf.subarray(y * canvas.w * 3, (y + 1) * canvas.w * 3), y * (canvas.w * 3 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(canvas.w, 0);
  ihdr.writeUInt32BE(canvas.h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// The meme itself
// ---------------------------------------------------------------------------
function drawGhostOfficer(cv: Canvas, x: number, y: number, w: number, h: number): void {
  // The make.fun ghost as a Leonida PD officer: police cap, gold star
  // badge, magenta star coin. Same ghost as the doctor version, new job.
  const cx = x + w / 2;
  // Soft blue-grey shadow, offset down-right, so white reads on paper.
  cv.fillCircle(cx + 8, y + w / 2 + 10, w / 2, GHOST_SHADOW);
  cv.fillRect(x + 8, y + w / 2 + 10, w, h - w / 2, GHOST_SHADOW);
  // Navy outline (a slightly larger ghost underneath), then the white body.
  cv.fillCircle(cx, y + w / 2, w / 2 + 4, NAVY);
  cv.fillRect(x - 4, y + w / 2, w + 8, h - w / 2, NAVY);
  cv.fillCircle(cx, y + w / 2, w / 2, GHOST);
  cv.fillRect(x, y + w / 2, w, h - w / 2, GHOST);
  // Wavy hem: three scallops cut out with the paper colour.
  const scallopR = w / 6;
  for (let i = 0; i < 3; i++) {
    cv.fillCircle(x + scallopR + i * 2 * scallopR, y + h, scallopR, PAPER);
  }
  // Police cap: crown sitting on the dome + brim + gold band + cap badge.
  cv.fillCircle(cx, y - 4, Math.floor(w * 0.44), NAVY);
  cv.fillRect(x + 6, y - 4, w - 12, 62, NAVY);
  cv.fillRect(cx - Math.floor(w * 0.56), y + 52, Math.floor(w * 1.12), 14, NAVY);
  cv.fillRect(x + 6, y + 40, w - 12, 8, GOLD);
  cv.fillCircle(cx, y + 22, 13, GOLD);
  cv.star(cx, y + 22, 9, 4, NAVY);
  // Sparkle eyes (four-point stars) in navy, big enough to read at 480px.
  const eyeY = y + Math.floor(h * 0.40);
  const eyeDX = Math.floor(w * 0.22);
  for (const ex of [cx - eyeDX, cx + eyeDX]) {
    cv.star(ex, eyeY, 21, 7, NAVY);
    cv.fillCircle(ex - 5, eyeY - 5, 4, GHOST);
  }
  // Little smile: a short arc under the eyes.
  for (let a = 25; a <= 155; a += 5) {
    const rad = (a * Math.PI) / 180;
    cv.fillCircle(cx + 13 * Math.cos(rad), eyeY + 30 + 13 * Math.sin(rad), 3, NAVY);
  }
  // Blush.
  cv.fillCircle(cx - eyeDX - 28, eyeY + 26, 11, BLUSH);
  cv.fillCircle(cx + eyeDX + 28, eyeY + 26, 11, BLUSH);
  // Gold star badge on the chest.
  cv.star(cx, y + Math.floor(h * 0.72), 24, 10, GOLD);
  cv.star(cx, y + Math.floor(h * 0.72), 13, 6, NAVY);
  // Magenta star coin held up at the ghost's right side.
  const coinX = x + w + 6;
  const coinY = y + Math.floor(h * 0.52);
  cv.fillCircle(coinX, coinY, 34, MAGENTA);
  cv.star(coinX, coinY, 26, 11, GHOST);
}

function drawMeme(): Canvas {
  const W = 1024;
  const H = 1024;
  const cv = new Canvas(W, H, PAPER);

  // --- Header: navy police band (y 0..200) ---------------------------------
  cv.fillRect(0, 0, W, 200, NAVY);
  // Gold badge: disc + navy star + gold centre, left of the title.
  cv.fillCircle(98, 100, 58, GOLD);
  cv.star(98, 100, 44, 18, NAVY);
  cv.fillCircle(98, 100, 14, GOLD);
  cv.text(180, 48, 'LEONIDA PD', 9, GHOST);
  cv.text(180, 128, 'TRAFFIC CITATION', 6, GHOST);

  // --- Five wanted stars (the GTA cue), centred under the band -------------
  for (let i = 0; i < 5; i++) {
    cv.star(512 - 2 * 46 + i * 46, 224, 16, 7, GOLD);
  }

  // --- Citation number (the date lives on the X post, not the ticket) --------
  cv.text(48, 256, 'CITATION No. GTA-VI-2026', 4, NAVY);
  cv.fillRect(48, 298, W - 96, 5, MAGENTA);

  // --- Body fields (left column, big type; the officer ghost is right) -----
  // Short on purpose: the judge reads the picture shrunk to 480px.
  const rows: Array<[string, number, RGB]> = [
    ['DRIVER: JASON', 5, NAVY],
    ['LOCATION: VICE CITY', 5, INK],
    ['VIOLATION:', 5, NAVY],
    ['DISTRACTED DRIVING', 5, INK],
    ["OFFICER'S REPORT:", 4, NAVY],
    ['HE SCROLLED.', 5, INK],
    ['THE CAR SWERVED.', 5, INK],
  ];
  let y = 326;
  for (const [s, scale, colour] of rows) {
    cv.text(48, y, s, scale, colour);
    y += scale === 4 ? 52 : 58;
  }

  // --- The make.fun ghost, officer of the citation (right column) -----------
  drawGhostOfficer(cv, 716, 330, 230, 300);
  cv.textFit(700, 662, 'make.fun', [6, 5], 290, MAGENTA);

  // --- Verdict ----------------------------------------------------------------
  cv.text(48, 718, 'STATUS: GUILTY', 6, MAGENTA);

  // --- Punchline, centred ------------------------------------------------------
  cv.textCentred(W / 2, 780, 'ONE SCROLL. ONE TICKET.', [6, 5], NAVY);
  cv.textCentred(W / 2, 834, 'ZERO EXCUSES.', [6, 5], MAGENTA);

  // --- Stamp: the pitch, in the meme's own voice ------------------------------
  cv.fillRect(48, 890, W - 96, 6, MAGENTA);
  cv.fillRect(48, 890, 6, 96, MAGENTA);
  cv.fillRect(W - 54, 890, 6, 96, MAGENTA);
  cv.fillRect(48, 980, W - 96, 6, MAGENTA);
  cv.textCentred(W / 2, 906, 'PAID BY MY AI AGENT', [6, 5], MAGENTA);
  cv.textCentred(W / 2, 948, 'WITH REAL MAKE.FUN EARNINGS', [4, 3], MAGENTA);

  return cv;
}

// ---------------------------------------------------------------------------
// Entry point: draw the meme, copy POST.json, write both to the output dir
// ---------------------------------------------------------------------------
function main(): void {
  const postPath = join(BOT_DIR, 'POST.json');
  const postRaw = readFileSync(postPath, 'utf8');
  const post = JSON.parse(postRaw) as { url?: unknown };
  if (typeof post.url !== 'string' || !post.url.startsWith('http')) {
    console.error('POST.json has no usable url string');
    process.exit(1);
  }
  if (post.url.includes('<handle>')) {
    console.error('NOTE: POST.json still holds the placeholder address — replace it with the real X post before submitting.');
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });

  // Determinism check: render twice in memory; the bytes must be identical.
  const pngA = encodePNG(drawMeme());
  const pngB = encodePNG(drawMeme());
  if (!pngA.equals(pngB)) {
    console.error('non-deterministic render: two runs differ');
    process.exit(1);
  }
  const memePath = join(OUTPUT_DIR, 'meme.png');
  writeFileSync(memePath, pngA);
  console.log(`meme.png 1024x1024 sha256=${createHash('sha256').update(pngA).digest('hex')}`);

  copyFileSync(postPath, join(OUTPUT_DIR, 'POST.json'));
  console.log('POST.json copied to output dir');
}

main();
