/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sohub: {
          bg: '#0C1016',       // Precise SOHub Dark Slate Canvas
          surface: '#121820',  // Elevated structural containers
          accent: '#11D8E8',   // Keeping your signature vivid cyan brand color
          textMuted: '#6B7A90',// Elegant low-contrast copy color
        }
      },
      fontFamily: {
        guka: ["'guka'", 'Georgia', 'serif'],
        outfit: ["'Outfit'", 'sans-serif'],
      },
      letterSpacing: {
        ultra: '0.15em',
        compressed: '-0.04em',
      }
    },
  },
  plugins: [],
}