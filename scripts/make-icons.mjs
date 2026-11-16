#!/usr/bin/env node
/**
 * Genera los íconos PNG de la PWA (192, 512, maskable y apple-touch).
 *
 * No hay dependencia de imágenes en el proyecto, así que se escribe el PNG a
 * mano con zlib (módulo nativo de Node). El dibujo es el mismo del favicon
 * SVG: fondo burdeos, un anillo dorado y la gota de perfume.
 *
 * Correr con: node scripts/make-icons.mjs
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "icons");

const BURGUNDY = [0x6e, 0x1f, 0x2c];
const GOLD = [0xc2, 0xa1, 0x5a];
const IVORY = [0xf7, 0xf4, 0xee];

function crc32(buf) {
  let c;
  const table = crc32.table ?? (crc32.table = (() => {
    const t = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c;
    }
    return t;
  })());
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filtro none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Dibuja el ícono con antialiasing por supermuestreo (3x3). */
function draw(size, { maskable = false } = {}) {
  const buf = Buffer.alloc(size * size * 4);
  const S = 3;
  // En maskable el arte se encoge al 80% para que quede dentro de la zona segura.
  const inset = maskable ? 0.1 : 0;
  const c = size / 2;

  const ringOuter = size * (0.34 - inset);
  const ringInner = ringOuter - size * 0.025;
  const dropTop = c - size * (0.22 - inset);
  const dropBottom = c + size * (0.09 - inset);
  const dropHalf = size * (0.13 - inset * 0.5);
  const dotY = c + size * (0.17 - inset);
  const dotR = size * 0.042;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let bg = 0, ring = 0, mark = 0;
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          const px = x + (sx + 0.5) / S - 0.5;
          const py = y + (sy + 0.5) / S - 0.5;
          const dx = px - c;
          const dy = py - c;
          const dist = Math.hypot(dx, dy);

          // fondo: cuadrado redondeado cuando no es maskable
          if (maskable) bg++;
          else {
            const r = size * 0.22;
            const ax = Math.abs(dx) - (c - r);
            const ay = Math.abs(dy) - (c - r);
            const inside =
              ax <= 0 && ay <= 0 ? true : Math.hypot(Math.max(ax, 0), Math.max(ay, 0)) <= r;
            if (inside) bg++;
          }

          if (dist <= ringOuter && dist >= ringInner) ring++;

          // gota: dos círculos y un triángulo que los une
          const insideDrop = (() => {
            const t = (py - dropTop) / (dropBottom - dropTop);
            if (t < 0 || t > 1) return false;
            const half = dropHalf * Math.min(1, 0.18 + t * 1.15);
            return Math.abs(dx) <= half;
          })();
          const circleBottom = Math.hypot(dx, py - (dropBottom - dropHalf)) <= dropHalf;
          if (insideDrop || circleBottom) mark++;
          if (Math.hypot(dx, py - dotY) <= dotR) mark++;
        }
      }
      const total = S * S;
      const aBg = bg / total;
      const aRing = ring / total;
      const aMark = mark / total;

      // Composición: burdeos sobre transparente, luego anillo y gota en oro.
      let r = BURGUNDY[0], g = BURGUNDY[1], b = BURGUNDY[2];
      const mix = (target, amount) => {
        r = r + (target[0] - r) * amount;
        g = g + (target[1] - g) * amount;
        b = b + (target[2] - b) * amount;
      };
      mix(GOLD, Math.max(aRing, aMark));
      if (maskable) {
        // fondo completo: se compone sobre marfil para el ícono maskable
        r = BURGUNDY[0] * aBg + IVORY[0] * (1 - aBg);
        g = BURGUNDY[1] * aBg + IVORY[1] * (1 - aBg);
        b = BURGUNDY[2] * aBg + IVORY[2] * (1 - aBg);
        const rr = GOLD[0] * Math.max(aRing, aMark);
        const gg = GOLD[1] * Math.max(aRing, aMark);
        const bb = GOLD[2] * Math.max(aRing, aMark);
        const amt = Math.max(aRing, aMark);
        r = r * (1 - amt) + rr * amt + (GOLD[0] - r) * amt * 0;
        g = g * (1 - amt) + gg * amt;
        b = b * (1 - amt) + bb * amt;
        r = Math.min(255, r);
      }

      const i = (y * size + x) * 4;
      buf[i] = Math.round(r);
      buf[i + 1] = Math.round(g);
      buf[i + 2] = Math.round(b);
      buf[i + 3] = Math.round(aBg * 255);
    }
  }
  return buf;
}

mkdirSync(OUT, { recursive: true });

const targets = [
  { file: "icon-192.png", size: 192, maskable: false },
  { file: "icon-512.png", size: 512, maskable: false },
  { file: "icon-maskable-512.png", size: 512, maskable: true },
  { file: "apple-touch-icon.png", size: 180, maskable: true },
  { file: "favicon-32.png", size: 32, maskable: false },
];

for (const t of targets) {
  const png = encodePng(t.size, t.size, draw(t.size, { maskable: t.maskable }));
  writeFileSync(join(OUT, t.file), png);
  console.log(`✓ ${t.file} (${t.size}x${t.size}, ${png.length} bytes)`);
}
