/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sunshine: "#FFF76A",
        "sunshine-hover": "#F5EC50",
        "sunshine-deep": "#EFE75C",
        ink: "#2E2B1A",
        "ink-muted": "#686450",
        "ink-subtle": "#8D8975",
        "warm-bg": "#FFFDF4",
        "warm-surface": "#FFFDF4",
        "warm-container": "#FBF6E3",
        "warm-container-low": "#FAF6E8",
        "warm-container-high": "#F5EED6",
        "warm-border": "#ECE5CC",
        "warm-border-strong": "#DFD6B5",
        honey: "#9A6B00",
        "honey-light": "#FFF3D6",
        "teal-green": "#1F8A70",
        "teal-green-light": "#E2F5EF",
        lavender: "#6C63B6",
        "lavender-light": "#EFEBFC",
        sage: "#7C9A6D",
        "sage-light": "#EDF4EA",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["var(--font-mono)", "IBM Plex Mono", "monospace"],
      },
      boxShadow: {
        "warm-sm": "0 2px 8px -2px rgba(46, 43, 26, 0.05)",
        "warm-md": "0 10px 30px -10px rgba(46, 43, 26, 0.07)",
        "warm-lg": "0 20px 48px -16px rgba(46, 43, 26, 0.09)",
        "warm-xl": "0 28px 64px -18px rgba(46, 43, 26, 0.12)",
        "sunshine-glow": "0 4px 20px rgba(255, 247, 106, 0.5)",
      },
      borderRadius: {
        "2xl": "20px",
        "3xl": "24px",
        "4xl": "28px",
      },
    },
  },
  plugins: [],
};
