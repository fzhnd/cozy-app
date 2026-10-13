import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cozy: {
          dark: '#150A35',
          accent: '#A577FF',
          light: '#F5F7FC',
        }
      }
    },
  },
  plugins: [],
};
export default config;