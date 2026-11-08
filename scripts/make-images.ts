/**
 * Generates placeholder estate imagery (layered hills, coffee rows, silver oaks)
 * as compressed WebP. Replace public/rooms/*.webp with the resort's photography
 * using the same file names; nothing else needs to change.
 */
import { mkdirSync } from "node:fs";
import sharp from "sharp";

const W = 1600;
const H = 1067;

type Mood = { sky: [string, string]; sun: string; hills: string[]; mist: string; ground: string };

const MOODS: Record<string, Mood> = {
  dawn: { sky: ["#f3e3cf", "#d9dfe0"], sun: "#f7d9a8", hills: ["#b9c4bd", "#8fa293", "#5f7a66", "#3d5a45"], mist: "#eef0ea", ground: "#2f4a36" },
  day: { sky: ["#dfe9ea", "#f2efe6"], sun: "#fbf3df", hills: ["#a9bcb1", "#7f9a87", "#55755e", "#34533d"], mist: "#f4f4ee", ground: "#2b4633" },
  dusk: { sky: ["#e7c9b3", "#b8b4be"], sun: "#f2b98d", hills: ["#9f9aa5", "#7a7f80", "#56635a", "#38463b"], mist: "#e6d9d0", ground: "#2a372d" },
  mist: { sky: ["#e4e6e2", "#d3d8d4"], sun: "#f1f1ec", hills: ["#c3cbc5", "#a3b1a7", "#7f9585", "#5a7462"], mist: "#f0f2ef", ground: "#3e5a46" },
};

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

function ridge(rand: () => number, base: number, amp: number, steps = 9) {
  const pts: string[] = [`M0 ${H}`, `L0 ${base}`];
  let prevX = 0;
  let prevY = base;
  for (let i = 1; i <= steps; i++) {
    const x = (W / steps) * i;
    const y = base - amp * (0.3 + rand() * 0.9) * Math.sin((i / steps) * Math.PI * (0.8 + rand() * 0.6));
    const cx = (prevX + x) / 2;
    pts.push(`Q${cx} ${prevY - amp * 0.25 * rand()} ${x} ${y}`);
    prevX = x;
    prevY = y;
  }
  pts.push(`L${W} ${H} Z`);
  return pts.join(" ");
}

function coffeeRows(rand: () => number, top: number, color: string) {
  let out = "";
  for (let r = 0; r < 9; r++) {
    const y = top + r * r * 9 + r * 18;
    const size = 6 + r * 4.2;
    const gap = size * 1.6;
    const shade = 0.55 + r * 0.05;
    for (let x = -gap + rand() * gap; x < W + gap; x += gap) {
      out += `<ellipse cx="${x.toFixed(1)}" cy="${(y + rand() * 3).toFixed(1)}" rx="${size.toFixed(1)}" ry="${(size * 0.62).toFixed(1)}" fill="${color}" opacity="${shade.toFixed(2)}"/>`;
    }
  }
  return out;
}

function silverOaks(rand: () => number, count: number, baseY: number, color: string) {
  let out = "";
  for (let i = 0; i < count; i++) {
    const x = rand() * W;
    const h = 160 + rand() * 260;
    const w = 3 + rand() * 4;
    out += `<rect x="${x}" y="${baseY - h}" width="${w}" height="${h}" fill="${color}" opacity="0.85"/>`;
    for (let k = 0; k < 4; k++) {
      out += `<ellipse cx="${x + (rand() - 0.5) * 40}" cy="${baseY - h + k * 30}" rx="${18 + rand() * 22}" ry="${10 + rand() * 10}" fill="${color}" opacity="0.7"/>`;
    }
  }
  return out;
}

function bungalow(x: number, y: number, s: number, wall: string, roof: string, pool = false) {
  const w = 260 * s;
  const h = 90 * s;
  let out = `<polygon points="${x - 30 * s},${y} ${x + w / 2},${y - 70 * s} ${x + w + 30 * s},${y}" fill="${roof}"/>`;
  out += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${wall}"/>`;
  for (let i = 0; i < 4; i++) out += `<rect x="${x + 22 * s + i * 60 * s}" y="${y + 24 * s}" width="${30 * s}" height="${42 * s}" fill="#f6d8a0" opacity="0.85"/>`;
  out += `<rect x="${x - 12 * s}" y="${y + h - 8 * s}" width="${w + 24 * s}" height="${10 * s}" fill="${roof}" opacity="0.8"/>`;
  if (pool) out += `<rect x="${x + w * 0.1}" y="${y + h + 18 * s}" width="${w * 0.8}" height="${34 * s}" rx="${6 * s}" fill="#9cc4c4" opacity="0.9"/>`;
  return out;
}

function scene(seed: number, mood: Mood, opts: { house?: "bungalow" | "pool" | "lodge"; rows?: boolean; oaks?: number }) {
  const rand = rng(seed);
  const [l1, l2, l3, l4] = mood.hills;
  const sunX = 300 + rand() * 1000;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mood.sky[0]}"/><stop offset="1" stop-color="${mood.sky[1]}"/></linearGradient>
    <radialGradient id="sun" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${mood.sun}" stop-opacity="0.95"/><stop offset="1" stop-color="${mood.sun}" stop-opacity="0"/></radialGradient>
    <linearGradient id="mist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mood.mist}" stop-opacity="0"/><stop offset="0.5" stop-color="${mood.mist}" stop-opacity="0.75"/><stop offset="1" stop-color="${mood.mist}" stop-opacity="0"/></linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#sky)"/>
  <circle cx="${sunX}" cy="${260 + rand() * 80}" r="260" fill="url(#sun)"/>
  <path d="${ridge(rand, 470, 170)}" fill="${l1}"/>
  <rect y="430" width="${W}" height="160" fill="url(#mist)"/>
  <path d="${ridge(rand, 560, 150)}" fill="${l2}"/>
  <rect y="530" width="${W}" height="140" fill="url(#mist)" opacity="0.8"/>
  <path d="${ridge(rand, 660, 120)}" fill="${l3}"/>
  ${opts.oaks ? silverOaks(rand, opts.oaks, 760, l4) : ""}
  ${opts.house === "bungalow" ? bungalow(560 + rand() * 300, 640, 1.15, "#efe6d6", "#7a4e3a") : ""}
  ${opts.house === "pool" ? bungalow(520 + rand() * 300, 590, 1.2, "#e9e4da", "#4f4a44", true) : ""}
  ${opts.house === "lodge" ? bungalow(200 + rand() * 900, 690, 0.7, "#ece3d3", "#6b4636") : ""}
  <path d="${ridge(rand, 770, 70, 6)}" fill="${l4}"/>
  ${opts.rows ? coffeeRows(rand, 790, l3) : ""}
  <rect y="${H - 120}" width="${W}" height="120" fill="${mood.ground}" opacity="0.55"/>
</svg>`;
}

const plan: Record<string, Parameters<typeof scene>[] > = {
  "plantation-view-room": [
    [11, MOODS.dawn, { rows: true, oaks: 9, house: "lodge" }],
    [12, MOODS.day, { rows: true, oaks: 14 }],
    [13, MOODS.mist, { rows: true, oaks: 6 }],
  ],
  "estate-deluxe-room": [
    [21, MOODS.day, { rows: true, oaks: 8, house: "lodge" }],
    [22, MOODS.mist, { oaks: 12 }],
    [23, MOODS.dusk, { rows: true, oaks: 5 }],
  ],
  "valley-suite": [
    [31, MOODS.dusk, { oaks: 4 }],
    [32, MOODS.mist, { oaks: 3 }],
    [33, MOODS.dawn, { rows: true, oaks: 6 }],
  ],
  "coffee-bungalow-villa": [
    [41, MOODS.day, { house: "bungalow", rows: true, oaks: 10 }],
    [42, MOODS.dusk, { house: "bungalow", oaks: 7 }],
    [43, MOODS.mist, { rows: true, oaks: 12 }],
  ],
  "private-pool-villa": [
    [51, MOODS.dawn, { house: "pool", oaks: 9 }],
    [52, MOODS.dusk, { house: "pool", oaks: 6 }],
    [53, MOODS.mist, { oaks: 14 }],
  ],
};

async function main() {
  mkdirSync("public/rooms", { recursive: true });
  for (const [slug, scenes] of Object.entries(plan)) {
    for (const [i, args] of scenes.entries()) {
      await sharp(Buffer.from(scene(...args)))
        .webp({ quality: 70 })
        .toFile(`public/rooms/${slug}-${i + 1}.webp`);
    }
  }
  await sharp(Buffer.from(scene(7, MOODS.dawn, { rows: true, oaks: 11, house: "lodge" })))
    .webp({ quality: 72 })
    .toFile("public/hero.webp");
  console.log("Images written");
}

main();
