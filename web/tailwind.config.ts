import type { Config } from "tailwindcss";

/**
 * CAD Engine marketing tokens.
 * Named hex values only. One accent. No purple family.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0A0C0F",
        panel: "#13171E",
        rule: "#2C3642",
        paper: "#F3EEE6",
        mute: "#8B949E",
        signal: "#E85D04",
      },
      fontFamily: {
        display: ["var(--font-space)", "ui-sans-serif", "sans-serif"],
        sans: ["var(--font-plex)", "ui-sans-serif", "sans-serif"],
        mono: ["var(--font-plex-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        display: [
          "clamp(2.75rem, 7vw, 5.35rem)",
          { lineHeight: "0.9", letterSpacing: "-0.045em", fontWeight: "500" },
        ],
        h2: [
          "clamp(1.75rem, 3.2vw, 2.75rem)",
          { lineHeight: "1.08", letterSpacing: "-0.03em", fontWeight: "500" },
        ],
        h3: ["1.375rem", { lineHeight: "1.25", letterSpacing: "-0.02em", fontWeight: "500" }],
        body: ["1.0625rem", { lineHeight: "1.65", fontWeight: "400" }],
        caption: [
          "0.75rem",
          { lineHeight: "1.4", letterSpacing: "0.08em", fontWeight: "500" },
        ],
      },
      maxWidth: {
        sheet: "1440px",
      },
      spacing: {
        gutter: "var(--gutter)",
      },
    },
  },
};

export default config;
