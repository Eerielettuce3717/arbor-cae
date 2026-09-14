import type { Config } from "tailwindcss";

/**
 * CAD Engine desktop tokens.
 * Semantic CSS-variable colors. One accent (OSHA / Haas orange). No purple family.
 */
const config: Config = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        muted: "var(--muted)",
        "muted-foreground": "var(--muted-foreground)",
        faint: "var(--faint)",
        border: "var(--border)",
        accent: "var(--accent)",
        "accent-foreground": "var(--accent-foreground)",
        hover: "var(--hover)",
        active: "var(--active)",
        ring: "var(--accent)",
        eng: {
          bg: "var(--background)",
          panel: "var(--card)",
          elevated: "var(--muted)",
          hover: "var(--hover)",
          active: "var(--active)",
          border: "var(--border)",
          text: "var(--foreground)",
          muted: "var(--muted-foreground)",
          faint: "var(--faint)",
        },
      },
      fontFamily: {
        display: [
          "Space Grotesk",
          "IBM Plex Sans",
          "ui-sans-serif",
          "sans-serif",
        ],
        sans: [
          "Space Grotesk",
          "IBM Plex Sans",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
        mono: ["Geist Mono", "IBM Plex Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        sm: "2px",
        DEFAULT: "2px",
        md: "4px",
        lg: "4px",
      },
      boxShadow: {
        none: "none",
      },
    },
  },
};

export default config;
