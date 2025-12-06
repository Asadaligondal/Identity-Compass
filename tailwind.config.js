/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'cyber-dark': '#121212',
        'cyber-grey': '#1E1E1E',
        'cyber-text': '#E0E0E0',
        'cyber-muted': '#9E9E9E',
        'neon-blue': '#00D4FF',
        'neon-purple': '#B74FFF',
        'neon-green': '#39FF14',
      },
    },
  },
  plugins: [],
}
