/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        void: "#030409",
        ghost: "#F4F4F8",
        magenta: "#FF00E5",
        cyan: "#00EFFF",
        violet: "#A100FF",
      },
      fontFamily: {
        heading: ["Bebas Neue", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["Space Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
