import type { Config } from "tailwindcss";

const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: v("bg"),
        surface: v("surface"),
        surface2: v("surface2"),
        border: v("border"),
        text: v("text"),
        muted: v("muted"),
        brand: v("brand"),
        brand2: v("brand2"),
        cyan: v("cyan"),
        ok: v("ok"),
        warn: v("warn"),
        danger: v("danger"),
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: { "fade-up": "fade-up 0.4s ease-out both" },
    },
  },
  plugins: [],
};

export default config;
