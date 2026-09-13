import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Space_Grotesk } from "next/font/google";
import { JsonLd } from "@/components/JsonLd";
import { pageMeta, siteJsonLd } from "@/lib/seo";
import { ROUTES, SITE_URL } from "@/lib/site";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-plex",
  display: "swap",
  weight: ["400", "500"],
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-plex-mono",
  display: "swap",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  ...pageMeta({
    title: "Arbor — parametric CAD, native ECAD, zero cloud",
    description:
      "Open-source local-first desktop CAD, CAM, and ECAD. OpenCASCADE solids, SQLite versioning, Gerber out. The STEP file never leaves this machine.",
    path: ROUTES.home,
  }),
  metadataBase: new URL(SITE_URL),
  applicationName: "Arbor",
  authors: [{ name: "Arbor Contributors" }],
  creator: "Arbor Contributors",
  publisher: "Arbor Contributors",
  category: "CAD",
  keywords: [
    "CAD",
    "CAM",
    "ECAD",
    "OpenCASCADE",
    "local-first",
    "parametric modeling",
    "Gerber",
    "open source CAD",
  ],
  robots: { index: true, follow: true },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: "/icon.svg",
    apple: "/apple-touch-icon.png",
  },
  verification: {
    google: "_jv1ortqoo-qGdnsLPO1WUezP-NAAabIfEEEXI_-hUo",
    other: {
      "google-site-verification": "GGYs_DeEPOpFRg5tGALcPWca2tFZg6pn1_dV42sA9bI",
    },
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${plexSans.variable} ${plexMono.variable} h-full`}
    >
      <body className="min-h-full bg-ink text-paper font-sans antialiased">
        <JsonLd data={siteJsonLd()} />
        {children}
      </body>
    </html>
  );
}
