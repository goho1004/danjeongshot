/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: "#f2f4f7",
          deep: "#e4e9ef",
        },
        ink: {
          950: "#0a0e14",
          900: "#121821",
          700: "#2c3544",
          500: "#5c6778",
          400: "#7a8494",
          300: "#a8b0bd",
          100: "#dfe3ea",
          50: "#f0f2f5",
        },
        studio: {
          DEFAULT: "#0d5c4d",
          soft: "#c5e6de",
          mist: "#e8f4f1",
          deep: "#084038",
        },
        // alias — MakeStudio 등 기존 클래스 호환
        accent: {
          DEFAULT: "#0d5c4d",
          soft: "#c5e6de",
          deep: "#084038",
        },
      },
      fontFamily: {
        display: ['"Instrument Serif"', "Georgia", "serif"],
        sans: ['"Noto Sans KR"', "system-ui", "sans-serif"],
      },
      letterSpacing: {
        brand: "0.04em",
      },
      boxShadow: {
        lift: "0 20px 50px -24px rgba(10, 14, 20, 0.35)",
        soft: "0 8px 30px -12px rgba(10, 14, 20, 0.12)",
      },
    },
  },
  plugins: [],
};
