import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        nerdio: {
          navy: "#042838",
          teal: "#1e9db8",
          lime: "#cdff4e",
          "teal-light": "#94cfd9",
          dark: "#03171e",
          muted: "#6b8a99",
        },
      },
      fontFamily: {
        poppins: ["Poppins", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease forwards",
        "slide-up": "slideUp 0.5s ease forwards",
        "grid-drift": "gridDrift 25s linear infinite",
        "glow-pulse": "glowPulse 7s ease-in-out infinite",
        spin: "spin 0.6s linear infinite",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        gridDrift: {
          "0%": { transform: "translate(0, 0)" },
          "100%": { transform: "translate(40px, 40px)" },
        },
        glowPulse: {
          "0%, 100%": { opacity: "0.25", transform: "scale(1)" },
          "50%": { opacity: "0.5", transform: "scale(1.08)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
