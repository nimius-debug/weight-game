import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#10b981",
          dark: "#059669",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
