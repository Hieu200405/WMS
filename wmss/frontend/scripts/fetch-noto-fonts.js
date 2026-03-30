 
// Helper script to download Noto Sans TTF files into frontend/src/assets/fonts/
// Usage: node scripts/fetch-noto-fonts.js
// This avoids committing large binary fonts to git if you prefer to manage them locally.

const https = require('https');
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'src', 'assets', 'fonts');
const files = [
  {
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/notosans/NotoSans-Regular.ttf',
    name: 'NotoSans-Regular.ttf',
  },
  {
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/notosans/NotoSans-Bold.ttf',
    name: 'NotoSans-Bold.ttf',
  },
];

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const download = (file) => new Promise((resolve, reject) => {
  const filePath = path.join(outDir, file.name);
  const fileStream = fs.createWriteStream(filePath);
  https.get(file.url, (res) => {
    if (res.statusCode !== 200) {
      reject(new Error(`Failed to download ${file.url}: ${res.statusCode}`));
      return;
    }
    res.pipe(fileStream);
    fileStream.on('finish', () => {
      fileStream.close();
      console.log('Saved', filePath);
      resolve();
    });
  }).on('error', (err) => {
    fs.unlink(filePath, () => {});
    reject(err);
  });
});

(async () => {
  try {
    for (const f of files) {
      console.log('Downloading', f.url);
      await download(f);
    }
    console.log('All fonts downloaded to', outDir);
  } catch (err) {
    console.error('Error downloading fonts:', err);
    process.exit(1);
  }
})();
