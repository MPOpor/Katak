/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        parnuan: {
          bg: '#FEFDF5',          // Soft Light Yellow / Cream Pastel background
          card: '#FFFFFF',
          yellow: '#F59E0B',      // Primary Warm Honey Amber
          yellowDark: '#D97706',  // Amber 600
          yellowLight: '#FEF9C3', // Soft Pastel Yellow (yellow-100)
          yellowSoft: '#FFFDF0',  // Cream Butter 50
          amber: '#F59E0B',
          green: '#10B981',
          greenDark: '#059669',
          greenLight: '#ECFDF5',
          text: '#1F2937',
          muted: '#6B7280',
          border: '#FDE68A',      // Soft Yellow Border (yellow-200)
        }
      },
      fontFamily: {
        sans: ['"Prompt"', '"Outfit"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(245, 158, 11, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)',
        'card': '0 2px 14px rgba(245, 158, 11, 0.06)',
        'float': '0 10px 30px -5px rgba(245, 158, 11, 0.35)',
      }
    },
  },
  plugins: [],
}
