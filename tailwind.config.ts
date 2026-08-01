import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/modules/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        pasture: "#16803C",
        meadow: "#ECFDF3"
      },
      boxShadow: {
        soft: "0 4px 12px rgba(0, 0, 0, 0.06)"
      }
    }
  },
  plugins: []
};

export default config;
