/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // Scan all JS, JSX, TS, TSX files in src/
    "./public/index.html",       // Also scan your main HTML file
  ],
  theme: {
    extend: {
      // Define Discord-like colors with a focus on "full blackout"
      colors: {
        discord_dark: '#0A0A0A',       // Very dark gray, almost black for main background
        discord_light_dark: '#141414', // Slightly lighter than discord_dark for panels/cards
        discord_darker: '#000000',     // Pure black for deepest elements/borders
        discord_darkest: '#000000',    // Same as darker, or can be used for a slightly different gradient start/end if needed
        discord_blurple: '#7289DA',    // Retain original accent colors
        discord_green: '#43b581',
        discord_red: '#f04747',
        discord_gray: '#99AAB5',       // For general text, slightly lighter for contrast
        discord_white: '#FFFFFF',      // Pure white for high contrast text
        // New shades for placeholders and very subtle accents
        gray_950: '#050505', // Even darker for very subtle accents
        gray_850: '#101010', // For placeholders, barely visible
      },
    },
  },
  plugins: [],
}
