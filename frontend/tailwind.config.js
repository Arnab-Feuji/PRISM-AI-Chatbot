/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html","./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        void:    "#060810",
        bg1:     "#0B0E1A",
        bg2:     "#111526",
        bg3:     "#161B2E",
        bg4:     "#1C2238",
        line:    "#222840",
        line2:   "#2A3055",
        ink:     "#DDE3F5",
        ink2:    "#8E96B8",
        ink3:    "#4A5270",
        gold:    "#F5C842",
        silver:  "#60A5FA",
        grn:     "#34D399",
        red:     "#F05252",
        ora:     "#F3752D",
        pur:     "#A78BFA",
        pink:    "#F472B6",
        teal:    "#2DD4BF",
        amber:   "#FBBF24",
      },
      fontFamily: {
        sans:  ["'DM Sans'", "sans-serif"],
        mono:  ["'Fira Code'", "monospace"],
        disp:  ["'Syne'", "sans-serif"],
      },
    },
  },
  plugins: [],
}
