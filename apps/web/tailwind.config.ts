import type { Config } from "tailwindcss";
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { 950: "#040c1a", 900: "#08172a", 800: "#102640", 700: "#163455", 600: "#214769" },
        teal: { 50: "#effbff", 100: "#def7ff", 200: "#b7edff", 300: "#8cdbff", 400: "#40cfff", 500: "#16b6ef", 600: "#128bc7", 700: "#1a6697", 800: "#184c78", 900: "#153454" },
        accent: "#12d7ff",
      },
      fontFamily: { sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"] },
      boxShadow: { glow: "0 0 40px -10px rgba(18,215,255,0.5)" },
    },
  },
  plugins: [],
} satisfies Config;
