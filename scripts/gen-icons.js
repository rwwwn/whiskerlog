const fs = require('fs');
const path = require('path');
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

const svgTemplate = (size) => {
  const r = (n) => Math.round(n * size);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`,
    `<rect width="${size}" height="${size}" rx="${r(0.22)}" fill="#0d9488"/>`,
    `<polygon points="${r(0.25)},${r(0.22)} ${r(0.18)},${r(0.08)} ${r(0.35)},${r(0.22)}" fill="#f0fdfa"/>`,
    `<polygon points="${r(0.75)},${r(0.22)} ${r(0.82)},${r(0.08)} ${r(0.65)},${r(0.22)}" fill="#f0fdfa"/>`,
    `<circle cx="${r(0.5)}" cy="${r(0.54)}" r="${r(0.28)}" fill="#f0fdfa"/>`,
    `<circle cx="${r(0.38)}" cy="${r(0.5)}" r="${r(0.055)}" fill="#0d9488"/>`,
    `<circle cx="${r(0.62)}" cy="${r(0.5)}" r="${r(0.055)}" fill="#0d9488"/>`,
    `<ellipse cx="${r(0.5)}" cy="${r(0.6)}" rx="${r(0.04)}" ry="${r(0.028)}" fill="#0d9488"/>`,
    `<line x1="${r(0.22)}" y1="${r(0.58)}" x2="${r(0.44)}" y2="${r(0.62)}" stroke="#0d9488" stroke-width="${r(0.018)}" stroke-linecap="round"/>`,
    `<line x1="${r(0.22)}" y1="${r(0.64)}" x2="${r(0.44)}" y2="${r(0.65)}" stroke="#0d9488" stroke-width="${r(0.018)}" stroke-linecap="round"/>`,
    `<line x1="${r(0.78)}" y1="${r(0.58)}" x2="${r(0.56)}" y2="${r(0.62)}" stroke="#0d9488" stroke-width="${r(0.018)}" stroke-linecap="round"/>`,
    `<line x1="${r(0.78)}" y1="${r(0.64)}" x2="${r(0.56)}" y2="${r(0.65)}" stroke="#0d9488" stroke-width="${r(0.018)}" stroke-linecap="round"/>`,
    `</svg>`,
  ].join('\n');
};

const iconsDir = path.join(__dirname, 'public', 'icons');
fs.mkdirSync(iconsDir, { recursive: true });

sizes.forEach(size => {
  const filePath = path.join(iconsDir, `icon-${size}x${size}.svg`);
  fs.writeFileSync(filePath, svgTemplate(size), 'utf8');
  console.log('wrote', filePath);
});

console.log('All SVG icons generated.');
