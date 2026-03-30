import jsPDF from 'jspdf';

let fontPromise;
let cachedFont;

const arrayBufferToBase64 = (buffer) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    let chunkString = '';
    for (let j = 0; j < chunk.length; j += 1) {
      chunkString += String.fromCharCode(chunk[j]);
    }
    binary += chunkString;
  }
  return window.btoa(binary);
};

// Prefer a font with full Vietnamese/Latin-extended coverage. We try loading Noto Sans
// from the Google Fonts GitHub raw content which contains full glyph coverage for Vietnamese.
// If that fails (no network), fall back to the bundled Inter fonts in assets.
// Local Noto files (if a developer has placed them in assets). Prefer local files to avoid
// runtime network fetch and to support offline builds/CI.
const LOCAL_NOTO_REGULAR = new URL('../assets/fonts/NotoSans-Regular.ttf', import.meta.url).href;
const LOCAL_NOTO_BOLD = new URL('../assets/fonts/NotoSans-Bold.ttf', import.meta.url).href;
const NOTO_REGULAR_URL = 'https://raw.githubusercontent.com/google/fonts/main/ofl/notosans/NotoSans-Regular.ttf';
const NOTO_BOLD_URL = 'https://raw.githubusercontent.com/google/fonts/main/ofl/notosans/NotoSans-Bold.ttf';
const INTER_REGULAR_URL = new URL('../assets/fonts/Inter-Regular.ttf', import.meta.url).href;
const INTER_SEMIBOLD_URL = new URL('../assets/fonts/Inter-SemiBold.ttf', import.meta.url).href;

const loadFontFile = async (href) => {
  const response = await fetch(href);
  if (!response.ok) {
    throw new Error(`Failed to load font ${href}`);
  }
  const buffer = await response.arrayBuffer();
  return arrayBufferToBase64(buffer);
};

const registerFont = (doc, fileName, family, style, base64) => {
  if (doc && typeof doc.addFileToVFS === 'function' && typeof doc.addFont === 'function') {
    doc.addFileToVFS(fileName, base64);
    doc.addFont(fileName, family, style);
    return;
  }
  if (jsPDF?.API?.addFileToVFS && jsPDF?.API?.addFont) {
    jsPDF.API.addFileToVFS(fileName, base64);
    jsPDF.API.addFont(fileName, family, style);
    return;
  }
  if (typeof jsPDF?.addFileToVFS === 'function' && typeof jsPDF?.addFont === 'function') {
    jsPDF.addFileToVFS(fileName, base64);
    jsPDF.addFont(fileName, family, style);
    return;
  }
  throw new Error('jsPDF font registration is not supported in this build.');
};

const loadFontData = async () => {
  // Try loading Noto Sans first (good Vietnamese coverage). If network fails, fall back to Inter.
  let regularBase64;
  let semiBoldBase64;
  let familyName = 'Inter';
  let regularFile = 'Inter-Regular.ttf';
  let boldFile = 'Inter-SemiBold.ttf';
  try {
    // 1) Try local Noto files (best: offline + full glyphs)
    regularBase64 = await loadFontFile(LOCAL_NOTO_REGULAR);
    semiBoldBase64 = await loadFontFile(LOCAL_NOTO_BOLD);
    familyName = 'NotoSans';
    regularFile = 'NotoSans-Regular.ttf';
    boldFile = 'NotoSans-Bold.ttf';
  } catch (errLocal) {
    try {
      // 2) Try fetching Noto from remote (runtime fetch)
      regularBase64 = await loadFontFile(NOTO_REGULAR_URL);
      semiBoldBase64 = await loadFontFile(NOTO_BOLD_URL);
      familyName = 'NotoSans';
      regularFile = 'NotoSans-Regular.ttf';
      boldFile = 'NotoSans-Bold.ttf';
    } catch (err) {
      // 3) Fall back to bundled Inter font files (may not have full VI glyphs)
      regularBase64 = await loadFontFile(INTER_REGULAR_URL);
      semiBoldBase64 = await loadFontFile(INTER_SEMIBOLD_URL);
      familyName = 'Inter';
      regularFile = 'Inter-Regular.ttf';
      boldFile = 'Inter-SemiBold.ttf';
    }
  }

  return {
    familyName,
    regularBase64,
    semiBoldBase64,
    regularFile,
    boldFile
  };
};

export const ensurePdfFonts = async (doc) => {
  if (typeof window === 'undefined') {
    return;
  }
  if (!fontPromise) {
    fontPromise = loadFontData()
      .then((data) => {
        cachedFont = data;
        window.__pdfFontFamily = data.familyName;
        return data;
      })
      .catch((err) => {
        fontPromise = null;
        throw err;
      });
  }
  const data = await fontPromise;
  if (doc && data) {
    registerFont(doc, data.regularFile, data.familyName, 'normal', data.regularBase64);
    registerFont(doc, data.boldFile, data.familyName, 'bold', data.semiBoldBase64);
  }
  return data ?? cachedFont;
};
