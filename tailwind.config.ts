import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        ink: "#0b1020",
        panel: "rgb(var(--panel) / <alpha-value>)",
        accent: "#0ea5e9",
        signal: "#f97316",
        mint: "#22c55e",
      },
      boxShadow: {
        panel: "0 24px 80px rgba(15, 23, 42, 0.18)",
      },
      backgroundImage: {
        grid: "radial-gradient(circle at 1px 1px, rgba(148, 163, 184, 0.18) 1px, transparent 0)",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        display: ["var(--font-display)"],
      },
    },
  },
  plugins: [],
};

export default config;

