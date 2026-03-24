# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

---

## PDF font & testing (Vietnamese)

If you want to verify PDF export with Vietnamese characters (Tiếng Việt), follow these steps:

1. (Optional but recommended) Download Noto Sans fonts into the project so PDF generation uses a font with full Vietnamese glyphs:

```powershell
cd c:\D\github\Nhom03_HTQLKH\wms\frontend
node scripts/fetch-noto-fonts.js
```

This will place `NotoSans-Regular.ttf` and `NotoSans-Bold.ttf` into `src/assets/fonts/`.

2. Start the dev server and open the application:

```powershell
npm install
npm run dev
```

3. Open the app and navigate to `/pdf-test` (you may need to log in if your app requires authentication). Click the Export PDF button — the generated PDF should render Vietnamese diacritics correctly when Noto Sans is available.

Notes:
- The app will try to use local Noto files if present. If not present, it will attempt to fetch Noto at runtime from the Google Fonts GitHub. If that fetch fails, the code falls back to the bundled Inter fonts in `src/assets/fonts`.
- For CI / offline reliability you can commit the TTF files to the repo (this increases repo size) or convert them to a base64 vfs module and import that instead.
# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

## Expanding the ESLint configuration
## PDF font & testing (Vietnamese)

If you want to verify PDF export with Vietnamese characters (Tiếng Việt), follow these steps:

1. (Optional but recommended) Download Noto Sans fonts into the project so PDF generation uses a font with full Vietnamese glyphs:

```powershell
cd c:\D\github\Nhom03_HTQLKH\wms\frontend
node scripts/fetch-noto-fonts.js
```

This will place `NotoSans-Regular.ttf` and `NotoSans-Bold.ttf` into `src/assets/fonts/`.

2. Start the dev server and open the application:

```powershell
npm install
npm run dev
```

3. Open the app and navigate to `/pdf-test` (you may need to log in if your app requires authentication). Click the Export PDF button — the generated PDF should render Vietnamese diacritics correctly when Noto Sans is available.

Notes:
- The app will try to use local Noto files if present. If not present, it will attempt to fetch Noto at runtime from the Google Fonts GitHub. If that fetch fails, the code falls back to the bundled Inter fonts in `src/assets/fonts`.
- For CI / offline reliability you can commit the TTF files to the repo (this increases repo size) or convert them to a base64 vfs module and import that instead.


If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
