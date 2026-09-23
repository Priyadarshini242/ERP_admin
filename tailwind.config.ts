import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#ecfff5",
          100: "#d7fbe7",
          200: "#b9f3d4",
          300: "#8ae6bb",
          400: "#53d79a",
          500: "#2bb673",
          600: "#1ea76b",
          700: "#178d5a",
          800: "#12734a",
          900: "#0f5d3f",
          950: "#0a3b2b",
        },
        ink: {
          950: "#070b16",
          900: "#0b1220",
          850: "#0f1729",
          800: "#141d33",
          700: "#1c2740",
        },
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
