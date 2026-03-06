import fs from 'fs';
import jpeg from 'jpeg-js';

const jpegData = fs.readFileSync('src/assets/LOGO-KATOS.png');
const rawImageData = jpeg.decode(jpegData, {useTArray: true});
const data = rawImageData.data;

const colors = {};
for (let i = 0; i < data.length; i += 4) {
  // simple quantization
  const r = Math.round(data[i] / 10) * 10;
  const g = Math.round(data[i+1] / 10) * 10;
  const b = Math.round(data[i+2] / 10) * 10;
  // ignore white-ish and black-ish
  if (r > 240 && g > 240 && b > 240) continue;
  if (r < 20 && g < 20 && b < 20) continue;
  
  const key = `${r},${g},${b}`;
  colors[key] = (colors[key] || 0) + 1;
}

const sortedColors = Object.entries(colors).sort((a, b) => b[1] - a[1]).slice(0, 5);
console.log("Top colors (R,G,B):", sortedColors);
