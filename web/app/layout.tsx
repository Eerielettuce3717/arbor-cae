import type { Metadata } from "next";
import Script from "next/script";
import { IBM_Plex_Mono, IBM_Plex_Sans, Space_Grotesk } from "next/font/google";
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
  metadataBase: new URL("https://eerielettuce3717.github.io/cad_engine"),
  title: "Arbor — parametric CAD, native ECAD, zero cloud",
  description:
    "Open-source local-first desktop CAD/CAM/ECAD. OpenCASCADE solids, SQLite versioning, Gerber out. The STEP file never leaves this machine.",
  applicationName: "Arbor",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: "/icon.svg",
    apple: "/apple-icon",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${plexSans.variable} ${plexMono.variable} h-full`}
    >
      <body className="min-h-full bg-ink text-paper font-sans antialiased">
        {/*
          TERMLY COOKIE CONSENT — replace YOUR_TERMLY_UUID_HERE with the Website
          UUID from your Termly dashboard (Consent Management → Installation)
          before this site goes to production. The placeholder will not load a banner.

          next/script strategy="beforeInteractive" injects this into <head> (the
          App Router equivalent of):
          <script type="text/javascript" src="https://app.termly.io/embed.min.js"
            data-auto-block="on" data-website-uuid="YOUR_TERMLY_UUID_HERE"></script>
        */}
        <Script
          src="https://app.termly.io/embed.min.js"
          strategy="beforeInteractive"
          data-auto-block="on"
          data-website-uuid="YOUR_TERMLY_UUID_HERE"
        />
        {children}
      </body>
    </html>
  );
}
