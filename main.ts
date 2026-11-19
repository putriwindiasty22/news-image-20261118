// The World Today - Wednesday 18 November 2026
//
// A deterministic 1024x1024 newspaper front page summing up the world news
// of Wednesday 18 November 2026: one lead story plus six more, each with a
// small drawn pictogram. Drawn with a hand-made 5x7 bitmap font and a
// hand-written PNG encoder. Node 22, standard library only, no network,
// no randomness, no clock: the output bytes are identical on every run.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------- palette
const PAPER = [246, 241, 230];
const INK = [26, 26, 26];
const RED = [163, 22, 33];
const BLUE = [31, 78, 121];
const GREY = [107, 101, 88];
const CREAM = [232, 226, 210];

// ---------------------------------------------------------------- canvas
const px = new Uint8Array(W * H * 3);

function fill(c) {
  for (let i = 0; i < W * H; i++) {
    px[i * 3] = c[0];
    px[i * 3 + 1] = c[1];
    px[i * 3 + 2] = c[2];
  }
}

function set(x, y, c) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0];
  px[i + 1] = c[1];
  px[i + 2] = c[2];
}

function rect(x, y, w, h, c) {
  for (let j = y; j < y + h; j++) {
    for (let i = x; i < x + w; i++) set(i, j, c);
  }
}

function hline(x, y, len, c) {
  for (let i = 0; i < len; i++) set(x + i, y, c);
}

function vline(x, y, len, c) {
  for (let j = 0; j < len; j++) set(x, y + j, c);
}

function line(x0, y0, x1, y1, c) {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    set(x, y, c);
    if (x === x1 && y === y1) break;
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

// Filled circle by horizontal scanlines.
function fillCircle(cx, cy, r, c) {
  for (let dy = -r; dy <= r; dy++) {
    const dx = Math.floor(Math.sqrt(r * r - dy * dy));
    hline(cx - dx, cy + dy, dx * 2 + 1, c);
  }
}

// One-pixel outline circle (midpoint algorithm).
function circle(cx, cy, r, c) {
  let x = r;
  let y = 0;
  let e = 1 - r;
  while (x >= y) {
    set(cx + x, cy + y, c);
    set(cx + y, cy + x, c);
    set(cx - y, cy + x, c);
    set(cx - x, cy + y, c);
    set(cx - x, cy - y, c);
    set(cx - y, cy - x, c);
    set(cx + y, cy - x, c);
    set(cx + x, cy - y, c);
    y++;
    if (e < 0) {
      e += 2 * y + 1;
    } else {
      x--;
      e += 2 * (y - x) + 1;
    }
  }
}

// Ellipse outline, drawn as short line segments.
function ellipse(cx, cy, rx, ry, c) {
  const n = Math.max(48, Math.floor((rx + ry) * 2));
  let px0 = cx + rx;
  let py0 = cy;
  for (let i = 1; i <= n; i++) {
    const t = (i / n) * Math.PI * 2;
    const x = Math.round(cx + rx * Math.cos(t));
    const y = Math.round(cy + ry * Math.sin(t));
    line(px0, py0, x, y, c);
    px0 = x;
    py0 = y;
  }
}

// Even-odd scanline fill for a simple polygon.
function fillPoly(pts, c) {
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    if (p[1] < minY) minY = p[1];
    if (p[1] > maxY) maxY = p[1];
  }
  for (let y = minY; y <= maxY; y++) {
    const xs = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
        const x = a[0] + ((y - a[1]) * (b[0] - a[0])) / (b[1] - a[1]);
        xs.push(x);
      }
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      hline(Math.ceil(xs[k]), y, Math.floor(xs[k + 1]) - Math.ceil(xs[k]) + 1, c);
    }
  }
}

// ---------------------------------------------------------------- 5x7 font
// Each glyph is 7 rows of 5 cells; '#' is ink, '.' is empty.
const GLYPHS = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.####', '#....', '#....', '#....', '#....', '#....', '.####'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.####', '#....', '#....', '#.###', '#...#', '#...#', '.###.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '##..#', '#.#.#', '#..##', '#..##', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '...#.', '..#..', '..#..', '..#..'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.....', '..#..'],
  ',': ['.....', '.....', '.....', '.....', '.....', '..#..', '.#...'],
  "'": ['..#..', '..#..', '.....', '.....', '.....', '.....', '.....'],
  '-': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
  ':': ['.....', '..#..', '.....', '.....', '.....', '..#..', '.....'],
  ';': ['.....', '..#..', '.....', '.....', '.....', '..#..', '.#...'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
  '(': ['...#.', '..#..', '.#...', '.#...', '.#...', '..#..', '...#.'],
  ')': ['.#...', '..#..', '...#.', '...#.', '...#.', '..#..', '.#...'],
  '/': ['....#', '...#.', '...#.', '..#..', '..#..', '.#...', '#....'],
  '&': ['.##..', '#..#.', '#.#..', '.#...', '#.#.#', '#..#.', '.##.#'],
  '%': ['#...#', '#..#.', '...#.', '..#..', '.#...', '#..#.', '#...#'],
  $: ['..#..', '.####', '#.#..', '.###.', '..#.#', '####.', '..#..'],
  '"': ['.#.#.', '.#.#.', '.....', '.....', '.....', '.....', '.....'],
  '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
  '=': ['.....', '.....', '#####', '.....', '#####', '.....', '.....'],
  '@': ['.###.', '#...#', '#.###', '#.#.#', '#.###', '#....', '.###.'],
  '#': ['.#.#.', '.#.#.', '#####', '.#.#.', '#####', '.#.#.', '.#.#.'],
};

function charWidth(scale) {
  return 6 * scale;
}

function textWidth(text, scale) {
  if (!text) return 0;
  return text.length * charWidth(scale) - scale;
}

function drawChar(x, y, ch, scale, c) {
  const g = GLYPHS[ch] || GLYPHS['?'];
  for (let r = 0; r < 7; r++) {
    for (let col = 0; col < 5; col++) {
      if (g[r][col] === '#') {
        rect(x + col * scale, y + r * scale, scale, scale, c);
      }
    }
  }
}

function drawText(x, y, text, scale, c) {
  for (let i = 0; i < text.length; i++) {
    drawChar(x + i * charWidth(scale), y, text[i], scale, c);
  }
  return textWidth(text, scale);
}

function drawCentered(cx, y, text, scale, c) {
  drawText(cx - Math.floor(textWidth(text, scale) / 2), y, text, scale, c);
}

// Greedy word wrap; returns an array of lines that fit maxW pixels.
function wrap(text, maxW, scale) {
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const trial = cur ? cur + ' ' + w : w;
    if (textWidth(trial, scale) <= maxW || !cur) {
      cur = trial;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function drawBlock(x, y, text, maxW, scale, c, lineGap) {
  const lines = wrap(text, maxW, scale);
  const lh = 7 * scale + lineGap;
  for (let i = 0; i < lines.length; i++) {
    drawText(x, y + i * lh, lines[i], scale, c);
  }
  return lines.length * lh;
}

// ---------------------------------------------------------------- pictograms
// Each draws a small scene in a box starting at (x, y), about `s` pixels wide.

// 1. Globe with three meeting leaders (lead story: the Shenzhen summit).
function picGlobe(x, y, s, c, accent) {
  const cx = x + Math.floor(s / 2);
  const cy = y + Math.floor(s / 2);
  const r = Math.floor(s / 2) - 3;
  circle(cx, cy, r, c);
  ellipse(cx, cy, Math.floor(r * 0.45), r, c);
  hline(cx - r, cy, r * 2 + 1, c);
  // Three leaders as red dots on the globe.
  fillCircle(cx - Math.floor(r * 0.45), cy - Math.floor(r * 0.35), 6, accent);
  fillCircle(cx + Math.floor(r * 0.1), cy - Math.floor(r * 0.55), 6, accent);
  fillCircle(cx + Math.floor(r * 0.5), cy + Math.floor(r * 0.3), 6, accent);
}

// 2. Starburst explosion over the Gulf (US strike / Iranian drones).
function picBurst(x, y, s, c, accent) {
  const cx = x + Math.floor(s / 2);
  const cy = y + Math.floor(s / 2);
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    const len = k % 2 === 0 ? Math.floor(s * 0.48) : Math.floor(s * 0.3);
    line(cx, cy, Math.round(cx + len * Math.cos(a)), Math.round(cy + len * Math.sin(a)), k % 3 === 0 ? accent : c);
  }
  fillCircle(cx, cy, Math.floor(s * 0.14), accent);
  // A small missile streaking away from the blast, top right.
  line(cx + 14, cy - 22, cx + 30, cy - 32, c);
  line(cx + 30, cy - 32, cx + 24, cy - 26, accent);
  line(cx + 30, cy - 32, cx + 22, cy - 34, accent);
}

// 3. Broken bridge (Kerch Bridge hit again).
function picBridge(x, y, s, c, accent) {
  const deckY = y + Math.floor(s * 0.55);
  const gap = Math.floor(s * 0.18);
  const cx = x + Math.floor(s / 2);
  // Two towers.
  rect(x + 8, y + 14, 5, deckY - y - 14, c);
  rect(x + s - 13, y + 14, 5, deckY - y - 14, c);
  // Suspension cables from the tower tops down to the deck.
  line(x + 10, y + 14, cx - gap - 2, deckY, c);
  line(x + s - 11, y + 14, cx + gap + 2, deckY, c);
  // Deck with a broken middle, two pixels thick so it reads clearly.
  hline(x + 4, deckY, cx - gap - x - 4, c);
  hline(cx + gap, deckY, x + s - 4 - (cx + gap), c);
  hline(x + 4, deckY + 2, cx - gap - x - 4, c);
  hline(cx + gap, deckY + 2, x + s - 4 - (cx + gap), c);
  hline(x + 4, deckY + 4, cx - gap - x - 4, c);
  hline(cx + gap, deckY + 4, x + s - 4 - (cx + gap), c);
  // The fallen span, tilted, in red.
  line(cx - gap + 2, deckY + 8, cx + 2, deckY + 24, accent);
  line(cx - gap + 2, deckY + 11, cx + 2, deckY + 27, accent);
  // Water below.
  hline(x + 4, deckY + 32, s - 8, BLUE);
  hline(x + 10, deckY + 38, s - 20, BLUE);
}

// 4. Ballot box with a checked slip (Alaska Senate race).
function picBallot(x, y, s, c, accent) {
  const bx = x + 10;
  const by = y + Math.floor(s * 0.45);
  const bw = s - 20;
  const bh = Math.floor(s * 0.42);
  rect(bx, by, bw, bh, c);
  rect(bx + 3, by + 3, bw - 6, bh - 6, PAPER);
  hline(bx + 8, by, bw - 16, PAPER);
  // The slip going in.
  rect(x + Math.floor(s / 2) - 9, y + 8, 18, 26, PAPER);
  rect(x + Math.floor(s / 2) - 9, y + 8, 18, 2, c);
  rect(x + Math.floor(s / 2) - 9, y + 8, 2, 26, c);
  rect(x + Math.floor(s / 2) + 7, y + 8, 2, 26, c);
  // Red check mark on the box.
  line(bx + 8, by + Math.floor(bh / 2), bx + 16, by + bh - 8, accent);
  line(bx + 16, by + bh - 8, bx + bw - 8, by + 8, accent);
}

// 5. Virus with spikes (measles).
function picVirus(x, y, s, c, accent) {
  const cx = x + Math.floor(s / 2);
  const cy = y + Math.floor(s / 2);
  const r = Math.floor(s * 0.26);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
    const x1 = Math.round(cx + r * Math.cos(a));
    const y1 = Math.round(cy + r * Math.sin(a));
    const x2 = Math.round(cx + (r + 9) * Math.cos(a));
    const y2 = Math.round(cy + (r + 9) * Math.sin(a));
    line(x1, y1, x2, y2, c);
    fillCircle(x2, y2, 3, accent);
  }
  circle(cx, cy, r, c);
  fillCircle(cx - 5, cy - 4, 3, c);
  fillCircle(cx + 6, cy + 3, 3, c);
  fillCircle(cx + 2, cy - 8, 2, c);
}

// 6. Computer chip (Nvidia record quarter).
function picChip(x, y, s, c, accent) {
  const m = 14;
  rect(x + m, y + m, s - 2 * m, s - 2 * m, c);
  rect(x + m + 3, y + m + 3, s - 2 * m - 6, s - 2 * m - 6, PAPER);
  rect(x + m + 12, y + m + 12, s - 2 * m - 24, s - 2 * m - 24, accent);
  for (let k = 0; k < 4; k++) {
    const t = x + m + 8 + k * 10;
    vline(t, y + 4, 10, c);
    vline(t, y + s - 14, 10, c);
    const t2 = y + m + 8 + k * 10;
    hline(x + 4, t2, 10, c);
    hline(x + s - 14, t2, 10, c);
  }
}

// 7. Cyclone spiral (Cyclone Akvan).
function picCyclone(x, y, s, c, accent) {
  const cx = x + Math.floor(s / 2);
  const cy = y + Math.floor(s / 2);
  let prevX = cx;
  let prevY = cy;
  const turns = 3.2;
  const steps = 130;
  for (let i = 1; i <= steps; i++) {
    const t = (i / steps) * turns * Math.PI * 2;
    const r = (i / steps) * (s * 0.46);
    const nx = Math.round(cx + r * Math.cos(t));
    const ny = Math.round(cy + r * Math.sin(t));
    line(prevX, prevY, nx, ny, i < steps / 2 ? accent : c);
    prevX = nx;
    prevY = ny;
  }
  fillCircle(cx, cy, 4, accent);
}

// ---------------------------------------------------------------- PNG encoder
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function encodePNG() {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour RGB
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- the page
const M = 40; // margin
const CONTENT_W = W - 2 * M;

fill(PAPER);

// Masthead.
drawCentered(W / 2, 26, "THE DAY'S NEWS IN ONE IMAGE", 1, GREY);
drawCentered(W / 2, 44, 'THE WORLD TODAY', 7, INK);
drawCentered(W / 2, 106, 'WEDNESDAY 18 NOVEMBER 2026', 2, RED);
rect(M, 130, CONTENT_W, 4, INK);
rect(M, 138, CONTENT_W, 1, INK);

// Lead story.
const LEAD_HEAD = 'XI AND PUTIN MEET IN SHENZHEN';
const LEAD_BODY =
  "XI JINPING AND VLADIMIR PUTIN OPENED TALKS IN SHENZHEN, A DAY BEFORE A " +
  'FIRST-EVER THREE-WAY SUMMIT WITH US PRESIDENT DONALD TRUMP. APEC LEADERS ' +
  'GATHER IN THE SAME CITY AS THE WORLD WATCHES.';
drawText(M, 158, 'LEAD STORY - SHENZHEN, CHINA', 1, RED);
drawBlock(M, 176, LEAD_HEAD, 720, 3, INK, 8);
drawBlock(M, 240, LEAD_BODY, 720, 2, INK, 6);
picGlobe(800, 168, 150, INK, RED);

// Divider.
rect(M, 352, CONTENT_W, 1, GREY);

// Six more stories, two columns by three rows.
const STORIES = [
  {
    head: 'US STRIKES IRAN SITE AS IRAN HITS GULF BASES',
    body: 'US JETS STRUCK A GUARD MISSILE SITE ON QESHM ISLAND. IRAN THEN FIRED DRONES AT US SITES IN KUWAIT AND BAHRAIN, AND A UAE SHIP WAS HIT IN THE STRAIT OF HORMUZ.',
    pic: picBurst,
  },
  {
    head: 'KERCH BRIDGE HIT AGAIN AS ROAD SPAN FALLS',
    body: 'UKRAINE STRUCK THE KERCH BRIDGE TO CRIMEA FOR A SECOND DAY. PART OF THE ROAD SPAN COLLAPSED INTO THE STRAIT, KYIV SAID.',
    pic: picBridge,
  },
  {
    head: 'PELTOLA WINS ALASKA AS DEMOCRATS TAKE 56 SEATS',
    body: 'DEMOCRAT MARY PELTOLA BEAT REPUBLICAN DAN SULLIVAN IN THE LAST SENATE RACE OF THE MIDTERMS. DEMOCRATS WILL HOLD A 56-44 MAJORITY.',
    pic: picBallot,
  },
  {
    head: 'US LOSES MEASLES-FREE STATUS AFTER 26 YEARS',
    body: 'HEALTH OFFICIALS SAID THE US NO LONGER MEETS ELIMINATION CRITERIA AFTER A SINGLE CHAIN OF SPREAD LASTED MORE THAN 12 MONTHS.',
    pic: picVirus,
  },
  {
    head: 'NVIDIA POSTS RECORD $115.8B QUARTER',
    body: "REVENUE MORE THAN DOUBLED TO $115.8 BILLION IN THE FIRST REPORT SINCE JENSEN HUANG'S EXIT. THE BOARD RULED OUT HIS RETURN AS CEO.",
    pic: picChip,
  },
  {
    head: "CYCLONE AKVAN BEARS DOWN ON INDIA'S COAST",
    body: 'THE STORM STRENGTHENED IN THE BAY OF BENGAL, WITH LANDFALL FORECAST ON THE ANDHRA PRADESH COAST ON FRIDAY WITH WINDS UP TO 145 KM/H.',
    pic: picCyclone,
  },
];

const CELL_W = 460;
const CELL_H = 148;
const GRID_X = [M, M + CELL_W + 24];
const GRID_Y = [372, 538, 704];
for (let i = 0; i < STORIES.length; i++) {
  const s = STORIES[i];
  const cx = GRID_X[i % 2];
  const cy = GRID_Y[Math.floor(i / 2)];
  const tx = cx + 88;
  const tw = CELL_W - 88;
  s.pic(cx, cy + 6, 72, INK, RED);
  drawBlock(tx, cy + 2, s.head, tw, 2, INK, 4);
  drawBlock(tx, cy + 62, s.body, tw, 1, INK, 3);
}

// Footer.
rect(M, 872, CONTENT_W, 1, INK);
drawCentered(
  W / 2,
  890,
  'ALL STORIES HAPPENED OR WERE FIRST REPORTED ON WEDNESDAY 18 NOVEMBER 2026',
  1,
  INK,
);
drawCentered(W / 2, 908, 'SOURCES: REUTERS - AP - AFP - BBC - PAHO - IMD', 1, GREY);
drawCentered(W / 2, 930, 'THE WORLD TODAY', 1, GREY);

// ---------------------------------------------------------------- write out
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'entry.png'), encodePNG());
