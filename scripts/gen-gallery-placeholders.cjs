const fs = require("fs");
const path = require("path");
const dir = path.join(__dirname, "..", "public", "gallery");
fs.mkdirSync(dir, { recursive: true });

function portrait({ phase, look, season, bg, label }) {
  const isBefore = phase === "before";
  const skin =
    look === "woman"
      ? season === "elder"
        ? "#d4b8a8"
        : season === "mid"
          ? "#e0c4b0"
          : "#eccbb8"
      : season === "elder"
        ? "#c9a890"
        : season === "mid"
          ? "#d4b49a"
          : "#e2c4a8";
  const hair =
    look === "woman"
      ? season === "elder"
        ? "#9a958c"
        : "#2a2420"
      : season === "elder"
        ? "#8a8580"
        : "#1a1816";
  const shirt =
    look === "woman"
      ? isBefore
        ? "#6b7c8a"
        : "#f4f6f8"
      : isBefore
        ? "#3d4a3c"
        : "#eef1f4";
  const outerBg = isBefore ? "#c5b8a8" : bg;
  const crop = isBefore ? "translate(8,12) scale(1.08)" : "";
  const hairPath =
    look === "woman"
      ? "M90 95 C60 70 55 140 70 175 C85 155 115 155 130 175 C145 140 140 70 110 95 Z"
      : "M95 100 C75 85 70 130 78 160 C100 145 120 145 142 160 C150 130 145 85 125 100 Z";
  const jaw =
    look === "woman"
      ? "M100 108 C78 108 72 145 78 168 C88 188 112 188 122 168 C128 145 122 108 100 108 Z"
      : "M100 110 C80 110 74 148 80 172 C90 192 110 192 120 172 C126 148 120 110 100 110 Z";
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 200 267">
  <rect width="200" height="267" fill="${outerBg}"/>
  <g transform="${crop}">
    <ellipse cx="100" cy="250" rx="70" ry="40" fill="${shirt}"/>
    <path d="${hairPath}" fill="${hair}"/>
    <path d="${jaw}" fill="${skin}"/>
    <ellipse cx="88" cy="138" rx="4" ry="5" fill="#3a3030" opacity="0.55"/>
    <ellipse cx="112" cy="138" rx="4" ry="5" fill="#3a3030" opacity="0.55"/>
    <path d="M94 155 Q100 160 106 155" fill="none" stroke="#8a6a5a" stroke-width="1.2" opacity="0.5"/>
  </g>
  <rect x="0" y="240" width="200" height="27" fill="#0a0e14" opacity="${isBefore ? 0.55 : 0.72}"/>
  <text x="100" y="257" text-anchor="middle" font-family="system-ui,sans-serif" font-size="9" fill="#fff" font-weight="600">${label}</text>
</svg>`;
}

const items = [
  ["resume-w-young", "woman", "young", "#f5f6f8", "이력서"],
  ["resume-m-mid", "man", "mid", "#eef0f3", "이력서"],
  ["resume-w-mid", "woman", "mid", "#f5f6f8", "이력서"],
  ["li-m-young", "man", "young", "#e8ecef", "링크드인"],
  ["li-w-young", "woman", "young", "#ebeff2", "링크드인"],
  ["li-m-elder", "man", "elder", "#e6eaee", "링크드인"],
  ["sheet-w-mid", "woman", "mid", "#f2f4f7", "인화"],
  ["sheet-m-young", "man", "young", "#eef1f4", "인화"],
  ["sheet-w-elder", "woman", "elder", "#f0f2f5", "인화"],
];

for (const [id, look, season, bg, purpose] of items) {
  for (const phase of ["before", "after"]) {
    const label = phase === "before" ? "셀카 · 전" : purpose + " · 후";
    const svg = portrait({ phase, look, season, bg, label });
    fs.writeFileSync(path.join(dir, `${id}-${phase}.svg`), svg);
  }
}
console.log("wrote", items.length * 2, "svgs");
