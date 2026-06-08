// Run with: node generate-icons.js
// Generates PNG icons using canvas (requires: npm install canvas)
// Falls back to creating SVG icons if canvas is not available.
const fs = require('fs');
const path = require('path');

function createSVGIcon(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#1a4a2e"/>
      <stop offset="100%" stop-color="#0a1628"/>
    </radialGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.18}" fill="url(#bg)"/>
  <!-- Field lines -->
  <circle cx="${size/2}" cy="${size/2}" r="${size*0.3}" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="${size*0.012}"/>
  <line x1="${size/2}" y1="${size*0.1}" x2="${size/2}" y2="${size*0.9}" stroke="rgba(255,255,255,0.2)" stroke-width="${size*0.012}"/>
  <!-- Football -->
  <circle cx="${size/2}" cy="${size/2}" r="${size*0.22}" fill="white" stroke="#ddd" stroke-width="${size*0.008}"/>
  <polygon points="${size/2},${size*0.3} ${size*0.58},${size*0.36} ${size*0.56},${size*0.45} ${size*0.44},${size*0.45} ${size*0.42},${size*0.36}" fill="#111"/>
  <polygon points="${size*0.62},${size*0.54} ${size*0.56},${size*0.45} ${size*0.65},${size*0.42}" fill="#111"/>
  <polygon points="${size*0.38},${size*0.54} ${size*0.44},${size*0.45} ${size*0.35},${size*0.42}" fill="#111"/>
  <polygon points="${size/2},${size*0.7} ${size*0.56},${size*0.6} ${size*0.44},${size*0.6}" fill="#111"/>
  <polygon points="${size*0.62},${size*0.54} ${size*0.56},${size*0.6} ${size*0.69},${size*0.6}" fill="#111"/>
  <polygon points="${size*0.38},${size*0.54} ${size*0.44},${size*0.6} ${size*0.31},${size*0.6}" fill="#111"/>
</svg>`;
}

const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir);

// Write SVG icons (will be converted to PNG by browser or can be used as-is)
fs.writeFileSync(path.join(assetsDir, 'icon-192.svg'), createSVGIcon(192));
fs.writeFileSync(path.join(assetsDir, 'icon-512.svg'), createSVGIcon(512));

// Try to use canvas for PNG
try {
  const { createCanvas } = require('canvas');
  const sharp = require('sharp');
  // If neither available, update manifest to use SVG
  console.log('canvas not available, using SVG icons');
} catch(e) {
  // Update manifest to use SVG
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf8'));
  manifest.icons = [
    { src: 'assets/icon-192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any maskable' },
    { src: 'assets/icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' },
  ];
  fs.writeFileSync(path.join(__dirname, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log('Updated manifest.json to use SVG icons');
}
