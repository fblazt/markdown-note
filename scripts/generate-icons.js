import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const publicDir = path.resolve(process.cwd(), 'public');
const faviconPath = path.join(publicDir, 'favicon.ico');
const masterPath = path.join(publicDir, 'pwa-icon-master.png');

if (!fs.existsSync(masterPath)) {
  console.log('Converting favicon.ico to pwa-icon-master.png (256x256)...');
  execSync(`sips -s format png "${faviconPath}" --out "${masterPath}"`, { stdio: 'inherit' });
}

const targets = [
  { file: 'pwa-192x192.png', width: 192, height: 192 },
  { file: 'pwa-512x512.png', width: 512, height: 512 },
  { file: 'apple-touch-icon-180x180.png', width: 180, height: 180 },
  { file: 'pwa-64x64.png', width: 64, height: 64 },
];

for (const target of targets) {
  const outPath = path.join(publicDir, target.file);
  console.log(`Generating ${target.file} (${target.width}x${target.height})...`);
  execSync(`sips -z ${target.height} ${target.width} "${masterPath}" --out "${outPath}"`, { stdio: 'inherit' });
}

if (fs.existsSync(masterPath)) {
  console.log('Cleaning up temporary master...');
  fs.unlinkSync(masterPath);
}

console.log('Icons successfully generated!');
