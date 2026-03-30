 
// CommonJS version so it can be executed inside projects that use "type": "module"
// Usage: node scripts/fetch-noto-fonts.cjs

const https = require('https');
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'src', 'assets', 'fonts');
// For resilience try a list of candidate URLs for each font (GitHub raw paths sometimes move)
const files = [
  {
    name: 'NotoSans-Regular.ttf',
    candidates: [
      // Some Google Fonts families use variable-font filenames with brackets; include encoded variants
      'https://raw.githubusercontent.com/google/fonts/main/ofl/notosans/NotoSans-Regular.ttf',
      'https://github.com/google/fonts/raw/main/ofl/notosans/NotoSans-Regular.ttf',
      'https://raw.githubusercontent.com/google/fonts/main/ofl/notosans/NotoSans%5Bwdth,wght%5D.ttf',
      'https://github.com/google/fonts/raw/main/ofl/notosans/NotoSans%5Bwdth,wght%5D.ttf',
      'https://raw.githubusercontent.com/google/fonts/main/ofl/noto-sans/NotoSans-Regular.ttf',
      'https://github.com/google/fonts/raw/main/ofl/noto-sans/NotoSans-Regular.ttf',
      // Roboto fallback (widely available and covers Vietnamese)
      'https://raw.githubusercontent.com/google/fonts/main/apache/roboto/Roboto-Regular.ttf',
      'https://github.com/google/fonts/raw/main/apache/roboto/Roboto-Regular.ttf',
    ],
  },
  {
    name: 'NotoSans-Bold.ttf',
    candidates: [
      'https://raw.githubusercontent.com/google/fonts/main/ofl/notosans/NotoSans-Bold.ttf',
      'https://github.com/google/fonts/raw/main/ofl/notosans/NotoSans-Bold.ttf',
      'https://raw.githubusercontent.com/google/fonts/main/ofl/notosans/NotoSans%5Bwdth,wght%5D.ttf',
      'https://github.com/google/fonts/raw/main/ofl/notosans/NotoSans%5Bwdth,wght%5D.ttf',
      'https://raw.githubusercontent.com/google/fonts/main/ofl/noto-sans/NotoSans-Bold.ttf',
      'https://github.com/google/fonts/raw/main/ofl/noto-sans/NotoSans-Bold.ttf',
      // Roboto Bold fallback
      'https://raw.githubusercontent.com/google/fonts/main/apache/roboto/Roboto-Bold.ttf',
      'https://github.com/google/fonts/raw/main/apache/roboto/Roboto-Bold.ttf',
    ],
  },
];

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const download = (url, outPath) => new Promise((resolve, reject) => {
  const fileStream = fs.createWriteStream(outPath);
  https.get(url, (res) => {
    if (res.statusCode !== 200) {
      fileStream.close();
      fs.unlink(outPath, () => {});
      reject(new Error(`Failed to download ${url}: ${res.statusCode}`));
      return;
    }
    res.pipe(fileStream);
    fileStream.on('finish', () => {
      fileStream.close();
      console.log('Saved', outPath);
      resolve();
    });
  }).on('error', (err) => {
    fileStream.close();
    fs.unlink(outPath, () => {});
    reject(err);
  });
});

const downloadWithCandidates = async (candidates, outPath) => {
  let lastErr = null;
  for (const url of candidates) {
    try {
      console.log('Trying', url);
       
      await download(url, outPath);
      return;
    } catch (err) {
      lastErr = err;
      console.warn('Failed to download from', url, ':', err.message);
    }
  }
  throw lastErr || new Error('No candidates available');
};

(async () => {
  try {
    for (const f of files) {
      const outPath = path.join(outDir, f.name);
      await downloadWithCandidates(f.candidates, outPath);
    }
    console.log('All fonts downloaded to', outDir);
  } catch (err) {
    console.error('Error downloading fonts:', err);
    process.exit(1);
  }
})();
