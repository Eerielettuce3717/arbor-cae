const DEFAULT_SITE_URL = "https://arbor-cae.github.io";

/** Override with NEXT_PUBLIC_SITE_URL when a custom domain is attached to Pages. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL
).replace(/\/$/, "");
export const SITE_NAME = "Arbor";
export const SITE_TAGLINE = "Parametric CAD, native ECAD, zero cloud";
export const GITHUB_REPO = "Eerielettuce3717/arbor-cae";
export const GITHUB_URL = `https://github.com/${GITHUB_REPO}`;
export const GITHUB_ISSUES = `${GITHUB_URL}/issues`;
export const GITHUB_CLONE = `${GITHUB_URL}.git`;
/** Pre-release tag. GitHub /releases/latest ignores prereleases, so download URLs use this tag. */
export const RELEASE_TAG = "v0.1.0-pre.1";
export const RELEASE_ASSETS = {
  macos: "Arbor.dmg",
  windows: "Arbor.msi",
  linux: "Arbor.AppImage",
} as const;
export const RELEASE_DOWNLOAD = {
  macos: `${GITHUB_URL}/releases/download/${RELEASE_TAG}/${RELEASE_ASSETS.macos}`,
  windows: `${GITHUB_URL}/releases/download/${RELEASE_TAG}/${RELEASE_ASSETS.windows}`,
  linux: `${GITHUB_URL}/releases/download/${RELEASE_TAG}/${RELEASE_ASSETS.linux}`,
  index: `${GITHUB_URL}/releases/tag/${RELEASE_TAG}`,
} as const;

export const ROUTES = {
  home: "/",
  about: "/about/",
  specs: "/specs/",
  modules: "/modules/",
  download: "/download/",
  contribute: "/contribute/",
  faq: "/faq/",
  license: "/license/",
  privacy: "/privacy-policy/",
  terms: "/terms-of-service/",
} as const;

export type RouteHref = (typeof ROUTES)[keyof typeof ROUTES];

export const NAV = [
  { href: ROUTES.about, label: "About" },
  { href: ROUTES.specs, label: "Specs" },
  { href: ROUTES.modules, label: "Modules" },
  { href: ROUTES.download, label: "Download" },
] as const;

export const FOOTER_SITEMAP = [
  { href: ROUTES.about, label: "About" },
  { href: ROUTES.specs, label: "Specs" },
  { href: ROUTES.modules, label: "Modules" },
  { href: ROUTES.download, label: "Download" },
  { href: ROUTES.contribute, label: "Contribute" },
  { href: ROUTES.faq, label: "FAQ" },
  { href: ROUTES.license, label: "License" },
  { href: ROUTES.privacy, label: "Privacy" },
  { href: ROUTES.terms, label: "Terms" },
] as const;

export function absoluteUrl(path: string) {
  if (path.startsWith("http")) return path;
  if (path === "/") return `${SITE_URL}/`;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
