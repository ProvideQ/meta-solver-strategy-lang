/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'app-bg': '#f6f8fb',
        'app-surface': '#ffffff',
        'app-muted': '#6b7280',
        'app-text': '#0f172a',
        'app-accent': '#2563eb',
        'app-danger': '#ef4444',
        'app-border': '#e5e7eb',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 6px 18px rgba(15, 23, 42, 0.06)',
      },
    },
  },
  plugins: [],
}
