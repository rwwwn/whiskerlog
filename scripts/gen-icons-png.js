const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, '..', 'public', 'icons');

async function run() {
  for (const size of sizes) {
    const svgPath = path.join(iconsDir, `icon-${size}x${size}.svg`);
    const pngPath = path.join(iconsDir, `icon-${size}x${size}.png`);
    const svgBuffer = fs.readFileSync(svgPath);
    await sharp(svgBuffer).resize(size, size).png().toFile(pngPath);
    console.log('wrote', pngPath);
  }
  console.log('All PNGs generated.');
}

run().catch(console.error);
