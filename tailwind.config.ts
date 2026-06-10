import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Warm ember/terracotta — the "hearth" brand accent. Used for the
        // primary action on every surface and the active nav state.
        brand: {
          50: "#fdf6f3",
          100: "#fbe9e1",
          200: "#f6cfbd",
          300: "#eeac90",
          400: "#e58a64",
          500: "#dd6a3f",
          600: "#c2410c", // primary
          700: "#9a350f",
          800: "#7c2d12",
          900: "#5f230f",
        },
        // Muted eucalyptus/teal — the complementary SECONDARY accent. Decorative
        // only (eyebrows, icon chips, dividers); never a primary action color, and
        // kept distinct from the semantic green (paid/done) and amber (unpaid).
        accent: {
          50: "#f0f7f5",
          100: "#dceee9",
          200: "#b9ddd4",
          300: "#8cc4b7",
          400: "#5ca596",
          500: "#3d8a7a",
          600: "#2f6d61",
          700: "#285a50",
          800: "#234a43",
          900: "#1f3e39",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "serif"],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.06)",
        "card-hover": "0 4px 12px -2px rgb(0 0 0 / 0.10)",
        // Warm ember-tinted lift for interactive cards/widgets on hover.
        glow: "0 8px 30px -12px rgb(194 65 12 / 0.18)",
      },
    },
  },
  plugins: [],
};

export default config;
