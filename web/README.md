# Arbor website

Static Next.js 16 export for the Arbor desktop CAD/CAM/ECAD suite.

Canonical host: https://eerielettuce3717.github.io/

This folder is **not** the CAD application. The product is the Tauri app in the repository root (`npm run tauri`). Window title: Arbor.

```bash
npm install
npm run dev
npm run build
```

`GITHUB_PAGES=true` prefixes assets with `/arbor-cae/` for project Pages. Leave it unset for the user-site root.

Set `NEXT_PUBLIC_SITE_URL` to a custom domain (no trailing slash) when GitHub Pages DNS is attached. Until then the canonical URL is the github.io host.
