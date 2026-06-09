import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
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
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "serif"],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.06)",
        "card-hover": "0 4px 12px -2px rgb(0 0 0 / 0.10)",
      },
    },
  },
  plugins: [],
};

export default config;
